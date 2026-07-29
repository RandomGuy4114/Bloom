interface BlogProps {
    title?: string
    subtitle?: string
    image?: string
    date?: string
}

export default function BlogPost({ title, subtitle, image, date }: BlogProps) {
    return (
        <div className="blog-post">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <img src={image} alt={title} />
            <p className="blog-date">{date}</p>
        </div>
    )
}

