interface WarningPopupProps {
    message: string
    onClose: () => void
    visible: boolean
}

export default function WarningPopup({ message, onClose, visible }: WarningPopupProps) {
    if (!visible) {
        return null
    }

    return (
        <div className="warning-popup">
            <div className="warning-popup-content">
                <p>You have been warned for breaking Bloom's terms of service.</p>
                <p style={{ fontWeight: "normal" }}>{message}</p>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    )
}
