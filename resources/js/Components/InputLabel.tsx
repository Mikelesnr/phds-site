import { LabelHTMLAttributes } from 'react';

export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { value?: string }) {
    return (
        <label
            {...props}
            className={
                `mb-1.5 block text-sm font-bold text-foreground ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}
