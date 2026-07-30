import { type FormEvent, useEffect, useState } from "react";
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import SubCommunity from "./SubCommunity";

interface SubCommunityRecord {
  id: string | number;
  title?: string;
  name?: string;
  description?: string | null;
  image?: string | null;
  picture_url?: string | null;
  is_member?: boolean;
  joined?: boolean;
  can_manage?: boolean;
}

type GetSubCommunitiesResponse =
  | SubCommunityRecord[]
  | {
      data?: SubCommunityRecord[];
      subcommunities?: SubCommunityRecord[];
      can_create?: boolean;
    };

interface SubCommunityListProps {
  communityId: string | null;
}

async function getFunctionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const responseBody = await error.context.text();

    try {
      const parsed = JSON.parse(responseBody) as {
        error?: string;
        message?: string;
      };
      return parsed.error ?? parsed.message ?? responseBody;
    } catch {
      return responseBody || `Request failed with status ${error.context.status}`;
    }
  }

  if (error instanceof FunctionsRelayError) {
    return `Supabase relay error: ${error.message}`;
  }

  if (error instanceof FunctionsFetchError) {
    return `Could not reach the server: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
}

function getRecords(response: GetSubCommunitiesResponse | null) {
  if (Array.isArray(response)) {
    return response;
  }

  return response?.data ?? response?.subcommunities ?? [];
}

export default function SubCommunityList({
  communityId,
}: SubCommunityListProps) {
  const [records, setRecords] = useState<SubCommunityRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);

      if (!communityId) {
        setRecords([]);
        setErrorMessage("The parent community was not specified.");
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Please log in to view sub-communities.");
        }

        const { data, error } =
          await supabase.functions.invoke<GetSubCommunitiesResponse>(
            "get-subcomms",
            {
              body: { subcomms_parent: communityId },
            },
          );

        if (controller.signal.aborted) {
          return;
        }

        if (error) {
          throw error;
        }

        setRecords(getRecords(data));
        setCanCreate(
          !Array.isArray(data) && data?.can_create === true,
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error fetching sub-communities:", error);
          setRecords([]);
          setErrorMessage(await getFunctionErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [communityId]);

  async function createSubcommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!communityId || isCreating) return;

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    setIsCreating(true);
    setErrorMessage(null);

    const { data, error } = await supabase.rpc("create_subcommunity", {
      parent_community: communityId,
      subcommunity_title: title,
      subcommunity_description: description,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsCreating(false);
      return;
    }

    const detailPath = window.location.pathname.startsWith("/mobile/")
      ? "/mobile/pages/communities/sub-community/"
      : "/pages/communities/sub-community/";
    window.location.href =
      `${detailPath}?subcommunityID=${encodeURIComponent(String(data))}`;
  }

  return (
    <section className="feed-updates" id="subComs">
      <h2>Sub-Communities</h2>
      {canCreate && !showCreateForm && (
        <button type="button" onClick={() => setShowCreateForm(true)}>
          Create Sub-Community
        </button>
      )}
      {showCreateForm && (
        <form className="sub-community-form" onSubmit={createSubcommunity}>
          <label>
            Name
            <input name="title" required maxLength={100} />
          </label>
          <label>
            Description
            <textarea name="description" maxLength={1000} />
          </label>
          <div className="sub-community-actions">
            <button type="submit" disabled={isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              disabled={isCreating}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <p>Loading sub-communities…</p>}
      {errorMessage && (
        <p className="sub-community-load-error" role="alert">
          Unable to load sub-communities: {errorMessage}
        </p>
      )}
      {!isLoading && !errorMessage && records.length === 0 && (
        <p>No sub-communities found.</p>
      )}

      <div className="sub-communities-container" id="subComsContainer">
        {records.map((record) => (
          <SubCommunity
            key={record.id}
            id={String(record.id)}
            name={record.title ?? record.name ?? "Untitled community"}
            description={record.description ?? ""}
            image={record.picture_url ?? record.image ?? undefined}
            isMember={record.is_member ?? record.joined ?? false}
          />
        ))}
      </div>
    </section>
  );
}
