export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
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

export type SharedProps = {
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
};
