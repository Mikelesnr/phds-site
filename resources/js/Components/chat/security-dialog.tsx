import { ShieldCheck } from 'lucide-react';
import type { ChatMember } from '@/types';
import { Modal } from './modal';

/** Security codes: read them to each other to be sure nobody swapped a key in between. */
export function SecurityDialog({
    members,
    codes,
    meId,
    onClose,
}: {
    members: ChatMember[];
    codes: Record<string, string>;
    meId: string;
    onClose: () => void;
}) {
    return (
        <Modal title="Encryption" onClose={onClose}>
            <div className="space-y-5">
                <p className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden="true" />
                    <span>
                        Messages here are end-to-end encrypted. They are locked in your browser and can only be read by
                        the people in this conversation. The server stores only scrambled text.
                    </span>
                </p>

                <p className="text-sm text-muted-foreground">
                    To be sure nobody has swapped a key, compare the security code below with the other person, in
                    person or by phone. If the codes match, you are talking to who you think you are.
                </p>

                <ul className="space-y-3">
                    {members.map((member) => (
                        <li key={member.id} className="rounded-2xl border border-border p-4">
                            <p className="font-bold">
                                {member.name}
                                {member.id === meId && <span className="ml-2 text-sm font-normal text-muted-foreground">(you)</span>}
                            </p>
                            {codes[member.id] ? (
                                <p data-testid={`code-${member.id}`} className="mt-1 font-mono text-sm tracking-wide">
                                    {codes[member.id]}
                                </p>
                            ) : (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Has not set up secure chat yet. They will be able to read this conversation once
                                    they do.
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
}
