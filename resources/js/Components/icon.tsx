import {
    BookOpen,
    Briefcase,
    CloudRain,
    Fish,
    Handshake,
    HeartPulse,
    Leaf,
    Lightbulb,
    Microscope,
    Network,
    PawPrint,
    Sprout,
    Users,
    type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
    book: BookOpen,
    briefcase: Briefcase,
    'cloud-rain': CloudRain,
    fish: Fish,
    handshake: Handshake,
    'heart-pulse': HeartPulse,
    leaf: Leaf,
    lightbulb: Lightbulb,
    microscope: Microscope,
    network: Network,
    'paw-print': PawPrint,
    sprout: Sprout,
    users: Users,
};

export function Icon({ name, className }: { name: string; className?: string }) {
    const Component = icons[name] ?? Leaf;
    return <Component className={className} aria-hidden="true" />;
}
