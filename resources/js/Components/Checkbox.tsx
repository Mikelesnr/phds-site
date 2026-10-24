import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'size-5 rounded border-border bg-card text-primary shadow-none focus:ring-ring ' +
                className
            }
        />
    );
}
