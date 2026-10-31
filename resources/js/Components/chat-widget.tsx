import { Link } from '@inertiajs/react';
import axios from 'axios';
import {
    ChevronDown,
    Handshake,
    House,
    Maximize2,
    Megaphone,
    MessageCircle,
    MessagesSquare,
    Minimize2,
    PenLine,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';
import { LogoMark } from '@/Components/logo';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

type Tab = 'home' | 'chat' | 'news';
type Message = {
    role: 'user' | 'assistant';
    content: string;
    blocked?: boolean;
};
type NewsPost = {
    id: number;
    title: string;
    excerpt: string;
    date: string | null;
    cover: string | null;
};

const STORAGE_KEY = 'phds-chat';
const MAX_CHARS = 500;
const HISTORY_SENT = 6;

const starters = [
    'What does PHDS do?',
    'Where do you work?',
    'What are your focus areas?',
    'How can we partner with you?',
];

/** Bold text and links to pages on this site. Nothing else is rendered as markup. */
function renderInline(text: string, onNavigate: () => void): ReactNode[] {
    const pattern =
        /\[([^\]]+)\]\((\/[A-Za-z0-9\-_/]*)\)|\*\*([^*]+)\*\*/g;
    const parts: ReactNode[] = [];
    let last = 0;
    let key = 0;

    for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0;
        if (index > last) parts.push(text.slice(last, index));

        if (match[1] && match[2]) {
            parts.push(
                <Link
                    key={key++}
                    href={match[2]}
                    onClick={onNavigate}
                    className="font-bold text-lime underline underline-offset-2"
                >
                    {match[1]}
                </Link>,
            );
        } else if (match[3]) {
            parts.push(<strong key={key++}>{match[3]}</strong>);
        }

        last = index + match[0].length;
    }

    if (last < text.length) parts.push(text.slice(last));

    return parts;
}

function BotText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
    const blocks = text.split(/\n{2,}/);

    return (
        <div className="space-y-2">
            {blocks.map((block, index) => {
                const lines = block.split('\n').filter(Boolean);
                const isList =
                    lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));

                if (isList) {
                    return (
                        <ul key={index} className="list-disc space-y-1 pl-5">
                            {lines.map((line, i) => (
                                <li key={i}>
                                    {renderInline(line.replace(/^[-*]\s+/, ''), onNavigate)}
                                </li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <p key={index} className="whitespace-pre-line">
                        {renderInline(block, onNavigate)}
                    </p>
                );
            })}
        </div>
    );
}

function loadMessages(): Message[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? (parsed as Message[]).slice(-30) : [];
    } catch {
        return [];
    }
}

export function ChatWidget({ raised }: { raised: boolean }) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [tab, setTab] = useState<Tab>('home');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [news, setNews] = useState<NewsPost[] | null>(null);
    const [newsFailed, setNewsFailed] = useState(false);

    const panelRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        setMessages(loadMessages());
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
        } catch {
            // storage unavailable, the chat just will not survive a refresh
        }
    }, [messages]);

    // Close when the visitor clicks or taps anywhere outside the chat, or presses Escape.
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (panelRef.current?.contains(target)) return;
            if (launcherRef.current?.contains(target)) return;
            setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
                launcherRef.current?.focus();
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => {
        if (open && tab === 'chat') inputRef.current?.focus();
    }, [open, tab]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }, [messages, sending, tab, open]);

    useEffect(() => {
        if (!open || tab !== 'news' || news !== null) return;

        axios
            .get<{ posts: NewsPost[] }>(routes.chatNews)
            .then(({ data }) => setNews(data.posts))
            .catch(() => setNewsFailed(true));
    }, [open, tab, news]);

    const send = async (raw: string) => {
        const content = raw.trim();
        if (!content || sending) return;

        const history = messages
            .filter((message) => !message.blocked)
            .slice(-HISTORY_SENT)
            .map(({ role, content: text }) => ({ role, content: text }));

        setMessages((current) => [...current, { role: 'user', content }]);
        setInput('');
        setError(null);
        setSending(true);

        try {
            const { data } = await axios.post<{ reply: string; blocked: boolean }>(
                routes.chat,
                { message: content, history },
            );

            setMessages((current) => {
                const next = [...current];
                if (data.blocked && next.length > 0) {
                    next[next.length - 1] = { ...next[next.length - 1], blocked: true };
                }
                return [
                    ...next,
                    { role: 'assistant', content: data.reply, blocked: data.blocked },
                ];
            });
        } catch (caught) {
            const reply =
                axios.isAxiosError(caught) &&
                typeof caught.response?.data?.reply === 'string'
                    ? (caught.response.data.reply as string)
                    : null;

            if (reply) {
                setMessages((current) => [
                    ...current,
                    { role: 'assistant', content: reply, blocked: true },
                ]);
            } else if (axios.isAxiosError(caught) && caught.response?.status === 429) {
                setError('You are sending messages quickly. Please wait a moment.');
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setSending(false);
        }
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        void send(input);
    };

    const clearChat = () => {
        setMessages([]);
        setError(null);
    };

    const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
        { id: 'home', label: 'Home', icon: <House className="size-5" aria-hidden="true" /> },
        {
            id: 'chat',
            label: 'Messages',
            icon: <MessagesSquare className="size-5" aria-hidden="true" />,
        },
        { id: 'news', label: 'News', icon: <Megaphone className="size-5" aria-hidden="true" /> },
    ];

    const headerButtons = (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? 'Make the chat smaller' : 'Make the chat larger'}
                className="hidden size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 sm:inline-flex"
            >
                {expanded ? (
                    <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                    <Maximize2 className="size-4" aria-hidden="true" />
                )}
            </button>
            <button
                type="button"
                onClick={close}
                aria-label="Close chat"
                className="inline-flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
            >
                <X className="size-5" aria-hidden="true" />
            </button>
        </div>
    );

    const actionCard =
        'flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-left transition hover:bg-black/60';

    return (
        <>
            {open && (
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-label="PHDS assistant"
                    className={cn(
                        'fixed inset-x-3 z-[55] flex h-[min(40rem,calc(100dvh-12rem))] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink text-white shadow-2xl sm:inset-x-auto sm:right-6',
                        expanded ? 'sm:w-[34rem]' : 'sm:w-[24rem]',
                        raised ? 'bottom-[9.25rem]' : 'bottom-[5.75rem]',
                    )}
                >
                    {tab === 'home' && (
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(120%_80%_at_0%_0%,#2f7d5b_0%,#145a3a_45%,#040605_85%)]">
                            <div className="flex items-start justify-between p-5">
                                <LogoMark className="size-11" />
                                {headerButtons}
                            </div>
                            <div className="px-6 pb-6 pt-10">
                                <p className="text-2xl font-medium text-white/70">Hi <span aria-hidden="true">👋</span></p>
                                <h2 className="mt-1 text-3xl font-medium leading-tight">
                                    How can we help you today?
                                </h2>
                            </div>
                            <div className="mt-auto space-y-3 px-4 pb-4">
                                <button
                                    type="button"
                                    onClick={() => setTab('chat')}
                                    className={actionCard}
                                >
                                    <span>
                                        <span className="block font-bold">Ask a question</span>
                                        <span className="text-white/70">We are here to help.</span>
                                    </span>
                                    <MessageCircle className="size-5 text-lime" aria-hidden="true" />
                                </button>
                                <Link href={routes.getInvolved} onClick={close} className={actionCard}>
                                    <span>
                                        <span className="block font-bold">Start a partnership</span>
                                        <span className="text-white/70">
                                            Get started on your partnership.
                                        </span>
                                    </span>
                                    <Handshake className="size-5 text-lime" aria-hidden="true" />
                                </Link>
                                <Link href={routes.contact} onClick={close} className={actionCard}>
                                    <span>
                                        <span className="block font-bold">
                                            Send a message to our team
                                        </span>
                                        <span className="text-white/70">
                                            Get in touch with our team directly.
                                        </span>
                                    </span>
                                    <PenLine className="size-5 text-lime" aria-hidden="true" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {tab === 'chat' && (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-forest px-4 py-3">
                                <div className="min-w-0">
                                    <h2 className="font-sans text-base font-bold">PHDS assistant</h2>
                                    <p className="truncate text-xs text-white/70">
                                        Ask about our work, where we work and our blog posts
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    {messages.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={clearChat}
                                            aria-label="Clear the conversation"
                                            className="inline-flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10"
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                        </button>
                                    )}
                                    {headerButtons}
                                </div>
                            </div>

                            <div
                                ref={listRef}
                                aria-live="polite"
                                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
                            >
                                {messages.length === 0 && (
                                    <div>
                                        <p className="text-white/80">
                                            Hello! I can answer questions about PHDS, our focus areas,
                                            the lake basin and our blog posts.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {starters.map((starter) => (
                                                <button
                                                    key={starter}
                                                    type="button"
                                                    onClick={() => void send(starter)}
                                                    className="rounded-full border border-lime/60 px-3 py-1.5 text-sm font-medium text-lime transition hover:bg-lime hover:text-accent-foreground"
                                                >
                                                    {starter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            'flex',
                                            message.role === 'user' ? 'justify-end' : 'justify-start',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed',
                                                message.role === 'user'
                                                    ? 'bg-accent text-accent-foreground'
                                                    : 'bg-white/10',
                                            )}
                                        >
                                            {message.role === 'user' ? (
                                                <p className="whitespace-pre-line">{message.content}</p>
                                            ) : (
                                                <BotText text={message.content} onNavigate={close} />
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {sending && (
                                    <div className="flex justify-start" aria-label="The assistant is typing">
                                        <div className="flex gap-1 rounded-2xl bg-white/10 px-4 py-3">
                                            {[0, 1, 2].map((dot) => (
                                                <span
                                                    key={dot}
                                                    className="size-2 animate-bounce rounded-full bg-white/70"
                                                    style={{ animationDelay: `${dot * 150}ms` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <p role="alert" className="text-sm font-medium text-red-300">
                                        {error}
                                    </p>
                                )}
                            </div>

                            <form onSubmit={onSubmit} className="border-t border-white/10 p-3">
                                <div className="flex items-end gap-2">
                                    <label htmlFor="chat-input" className="sr-only">
                                        Your question
                                    </label>
                                    <textarea
                                        id="chat-input"
                                        ref={inputRef}
                                        rows={1}
                                        maxLength={MAX_CHARS}
                                        value={input}
                                        onChange={(event) => setInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault();
                                                void send(input);
                                            }
                                        }}
                                        placeholder="Type your question"
                                        className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/50 focus:border-lime focus:ring-0"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || input.trim() === ''}
                                        aria-label="Send"
                                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
                                    >
                                        <Send className="size-5" aria-hidden="true" />
                                    </button>
                                </div>
                                <p className="mt-2 text-center text-[0.7rem] text-white/50">
                                    Answers come from this website. For anything important, please{' '}
                                    <Link
                                        href={routes.contact}
                                        onClick={close}
                                        className="underline"
                                    >
                                        contact the team
                                    </Link>
                                    .
                                </p>
                            </form>
                        </div>
                    )}

                    {tab === 'news' && (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="flex items-center justify-between border-b border-white/10 bg-forest px-4 py-3">
                                <h2 className="font-sans text-base font-bold">Latest news</h2>
                                {headerButtons}
                            </div>
                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                                {news === null && !newsFailed && (
                                    <p className="text-white/70">Loading...</p>
                                )}
                                {newsFailed && (
                                    <p className="text-white/70">News is not available right now.</p>
                                )}
                                {news?.length === 0 && (
                                    <p className="text-white/70">No posts have been published yet.</p>
                                )}
                                {news?.map((post) => (
                                    <Link
                                        key={post.id}
                                        href={routes.blogs}
                                        onClick={close}
                                        className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                                    >
                                        {post.cover && (
                                            <img
                                                src={post.cover}
                                                alt=""
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                className="size-16 shrink-0 rounded-xl object-cover"
                                            />
                                        )}
                                        <span className="min-w-0">
                                            <span className="block font-bold leading-snug">{post.title}</span>
                                            {post.date && (
                                                <span className="mt-0.5 block text-xs text-lime">{post.date}</span>
                                            )}
                                            <span className="mt-1 line-clamp-2 block text-sm text-white/70">
                                                {post.excerpt}
                                            </span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <nav
                        aria-label="Chat sections"
                        className="grid shrink-0 grid-cols-3 border-t border-white/10 bg-black"
                    >
                        {tabs.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setTab(item.id)}
                                aria-current={tab === item.id ? 'page' : undefined}
                                className={cn(
                                    'flex flex-col items-center gap-1 py-3 text-sm font-medium transition',
                                    tab === item.id ? 'text-lime' : 'text-white/80 hover:text-white',
                                )}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            )}

            <button
                ref={launcherRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={open ? 'Close chat' : 'Open chat'}
                className={cn(
                    'fixed right-4 z-[55] inline-flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xl transition hover:brightness-110 sm:right-6',
                    raised ? 'bottom-20' : 'bottom-6',
                )}
            >
                {open ? (
                    <ChevronDown className="size-7" aria-hidden="true" />
                ) : (
                    <MessageCircle className="size-7" aria-hidden="true" />
                )}
            </button>
        </>
    );
}
