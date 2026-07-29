interface SupporterBadgeProps {
    compact?: boolean
    label?: string
}

export default function SupporterBadge({ compact = true, label = "Supporter" }: SupporterBadgeProps) {
    return (
        <span
            className={`supporter-badge${compact ? " supporter-badge--compact" : ""}`}
            aria-label={`Bloom ${label}`}
            title={label}
        >
            <span aria-hidden="true">★</span>
            {!compact && <span>{label}</span>}
        </span>
    )
}
