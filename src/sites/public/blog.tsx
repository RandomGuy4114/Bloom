import PageLifecycle from "../../components/PageLifecycle"
import InfoPageHead from "../../components/InfoPageHead"
import BlogPost from "../../components/blog/blogPost"
import BottomBar from "../../components/BottomBar"

export const pagePath = "/pages/blog/"

const pageMetadata = {
    "bodyClass": "blog-page",
    "language": "en",
    "links": [
        "../../../css/styles.css",
        "https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap"
    ],
    "pagePath": "/pages/blog/",
    "redirect": null,
    "scripts": [],
    "styles": [],
    "title": "Bloom - Blog"
}

export default function PagesBlogPage() {
    return (
        <PageLifecycle {...pageMetadata}>
            <InfoPageHead 
                title="Bloom Blog" 
                subtitle="Updates, news, and more from the Bloom team." 
            />
            <BlogPost
                title="Goodbye HTML, Hello React!"
                subtitle="Hello Bloom users! I have an exciting announcement to make: Bloom is now built using React! This means that the website is now more dynamic, interactive, and user-friendly than ever before. With React, we can make a more seamless experience for our users, and making new features and updates will be much easier. I can't wait for you all to explore the new Bloom and see what we've been working on. Thank you for your continued support, and I hope you enjoy the new Bloom experience!"
                date="July 17, 2026"
                image="/src/Assets/react.png"
            />
            <BottomBar />
        </PageLifecycle>
    )
}
