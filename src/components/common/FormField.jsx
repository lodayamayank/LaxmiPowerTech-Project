import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * FormField: label + control + hint/error.
 *
 * Props:
 * - label {node}
 * - htmlFor {string}: id of the control
 * - hint {node}: helper text (hidden while an error is shown)
 * - error {node}: error message
 * - required {boolean}: adds a required marker after the label
 * - children {node}: the control
 * - className {string}
 * - ...props spread onto the root div
 */
export const FormField = ({ label, htmlFor, hint, error, required, children, className, ...props }) => (
  <div className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
    {label ? (
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-tone-bad-fg" aria-hidden="true">*</span> : null}
      </Label>
    ) : null}
    {children}
    {error ? (
      <p role="alert" className="text-caption text-tone-bad-fg">
        {error}
      </p>
    ) : hint ? (
      <p className="text-caption text-ink-3">{hint}</p>
    ) : null}
  </div>
);

export default FormField;
