export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    role: 'admin' | 'staff';
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};

export type Stat = { value: string; label: string; note: string };
export type Pillar = { title: string; body: string; icon: string };
export type Value = { title: string; body: string; icon: string };
export type County = { name: string; share: number };
export type BoardMember = {
    name: string;
    position: string;
    profession: string;
    contribution: string;
};
export type PartnershipRoute = {
    title: string;
    body: string;
    icon: string;
    interest: string;
};

export type FocusAreaCard = {
    slug: string;
    title: string;
    hook: string;
    summary: string;
    icon: string;
    image: string;
};

export type FocusAreaGroup = { heading: string; items: string[] };

export type FocusArea = {
    slug: string;
    title: string;
    icon: string;
    image: string;
    gallery: string[];
    hook: string;
    summary: string;
    intro: string;
    groups: FocusAreaGroup[];
    case?: string;
    story?: boolean;
};

export type FieldStory = { label: string; body: string; lesson: string };
export type Basin = { countries: string; summary: string };

type PhdsSharedProps = {
    site: {
        name: string;
        shortName: string;
        tagline: string;
        registration: string;
        contactEmail: string | null;
        contactLocation: string;
    };
    nav: {
        focusAreas: Array<{
            slug: string;
            title: string;
            hook: string;
            icon: string;
        }>;
    };
    flash: { success: string | null };
    team: { unreadMessages: number } | null;
    realtime: RealtimeConfig | null;
};

export type SharedProps = PageProps<PhdsSharedProps>;

export type BlogVideo = {
    provider: 'youtube' | 'vimeo';
    embed: string;
    thumbnail: string | null;
    url: string;
};

export type BlogPost = {
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    is_featured: boolean;
    published_label: string | null;
    author: string | null;
    cover: string | null;
    images: string[];
    videos: BlogVideo[];
};

export type PageLink = { url: string | null; label: string; active: boolean };

export type Paginated<T> = {
    data: T[];
    links: PageLink[];
    current_page: number;
    last_page: number;
    total: number;
};

export type AdminBlogRow = {
    id: number;
    title: string;
    is_featured: boolean;
    status: 'published' | 'draft';
    published_label: string | null;
    updated_label: string;
    author: string | null;
    author_id: number | null;
};

export type AdminBlogForm = {
    id: number;
    title: string;
    excerpt: string;
    body: string;
    images: string[];
    videos: string[];
    is_featured: boolean;
    published: boolean;
};

export type RealtimeConfig = {
    enabled: boolean;
    key: string | null;
    host: string | null;
    port: number;
    scheme: string;
    pollSeconds: number;
};

export type ChatMessage = {
    id: number;
    conversation_id: number;
    user_id: number | null;
    author: string;
    body: string | null;
    deleted: boolean;
    edited: boolean;
    created_at: string;
};

export type ChatMember = { id: number; name: string; moderator: boolean };

export type ChatConversation = {
    id: number;
    type: 'direct' | 'group';
    visibility: 'open' | 'private';
    title: string;
    description: string | null;
    is_moderator: boolean;
    can_leave: boolean;
    members: ChatMember[];
    messages: ChatMessage[];
};

export type SidebarItem = {
    id: number;
    type: 'direct' | 'group';
    visibility: 'open' | 'private';
    title: string;
    preview: string | null;
    last_at: string | null;
    unread: number;
};

export type ChatSidebar = { direct: SidebarItem[]; groups: SidebarItem[] };
export type ChatPerson = { id: number; name: string; role: string };
export type JoinableGroup = { id: number; name: string; description: string | null; members: number };

export type NotificationItem = {
    id: string;
    read: boolean;
    created_at: string | null;
    data: {
        kind: 'message' | 'added' | 'removed';
        conversation_id: number;
        title: string;
        sender: string | null;
        preview: string;
        count: number;
        url: string | null;
    };
};

export type AdminUserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    blogs_count: number;
    created_at: string;
    is_me: boolean;
};
