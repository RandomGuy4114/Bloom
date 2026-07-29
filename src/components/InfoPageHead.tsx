import { motion } from "motion/react"

interface InfoPageHeadProps {
    title?: string
    subtitle?: string
}

export default function InfoPageHead({ title, subtitle }: InfoPageHeadProps) {

    return (
        <div className="InfoPageHead">
            <motion.h1 initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} className="BlogTitle">{title}</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="BlogSubtitle">{subtitle}</motion.p>
        </div>
    )
}

