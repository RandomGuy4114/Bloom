import { useState } from "react";
import {
  FunctionsHttpError,
  FunctionsFetchError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase/client";
import "../App.css";

interface SubCommunityProps {
  name: string;
  description: string;
  image?: string;
  id: string;
  isMember?: boolean;
}

interface JoinResponse {
  success?: boolean;
  already_member?: boolean;
  message?: string;
}

export default function SubCommunity({
  name,
  description,
  image,
  id,
  isMember = false,
}: SubCommunityProps) {
  const detailPath = window.location.pathname.startsWith("/mobile/")
    ? "/mobile/pages/communities/sub-community/"
    : "/pages/communities/sub-community/";
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(isMember);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoin() {
    if (isJoining || hasJoined) {
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please log in before joining a sub-community.");
      }

      const { data, error } =
        await supabase.functions.invoke<JoinResponse>(
          "join-subcommunity",
          {
            body: {
              subcommunity_id: id,
            },
          },
        );

      if (error instanceof FunctionsHttpError) {
        const responseBody = await error.context.text();

        let message = responseBody;

        try {
          const parsed = JSON.parse(responseBody) as {
            error?: string;
            message?: string;
          };

          message =
            parsed.error ??
            parsed.message ??
            responseBody;
        } catch {
          message = responseBody;
        }

        throw new Error(
          message || `Join request failed with status ${error.context.status}`,
        );
      }

      if (error instanceof FunctionsRelayError) {
        throw new Error(`Supabase relay error: ${error.message}`);
      }

      if (error instanceof FunctionsFetchError) {
        throw new Error(`Could not reach the server: ${error.message}`);
      }

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success === false) {
        throw new Error(data?.message || "Unable to join sub-community");
      }

      setHasJoined(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to join sub-community";

      console.error("Failed to join sub-community:", error);
      setJoinError(message);
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <article className="sub-community" id={`sub-community-${id}`}>
      <div className="sub-community-picture" aria-hidden="true">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span>{name.trim().charAt(0).toUpperCase() || "B"}</span>
        )}
      </div>

      <h2 className="sub-community-name">{name}</h2>

      <p className="sub-community-description">
        {description}
      </p>

      <div className="sub-community-actions">
        <a
          className="sub-community-view-button"
          href={`${detailPath}?subcommunityID=${encodeURIComponent(id)}`}
        >
          View
        </a>
        <button
          type="button"
          className="sub-community-join-button"
          data-id={id}
          onClick={handleJoin}
          disabled={isJoining || hasJoined}
        >
          {isJoining ? "Joining…" : hasJoined ? "Joined" : "Join"}
        </button>
      </div>

      {joinError && (
        <p className="sub-community-join-error" role="alert">
          {joinError}
        </p>
      )}
    </article>
  );
}
