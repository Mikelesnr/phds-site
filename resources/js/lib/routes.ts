/** Central list of public URLs so links are never typed twice. */
export const routes = {
    home: '/',
    about: '/about',
    board: '/about/board',
    whatWeDo: '/what-we-do',
    focusArea: (slug: string) => `/focus-areas/${slug}`,
    whereWeWork: '/where-we-work',
    getInvolved: '/get-involved',
    contact: '/contact',
    blogs: '/blogs',
    adminBlogs: '/admin/blogs',
    adminBlogCreate: '/admin/blogs/create',
    adminBlogEdit: (id: number) => `/admin/blogs/${id}/edit`,
    adminBlog: (id: number) => `/admin/blogs/${id}`,
    adminBlogFeatured: (id: number) => `/admin/blogs/${id}/featured`,
    contactStore: '/contact',
    subscribeStore: '/subscribe',
} as const;
