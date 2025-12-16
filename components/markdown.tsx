import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const value = String(children).replace(/\n$/, "");

            if (!inline && match) {
              return <CodeBlock language={language} value={value} />;
            }

            return (
              <code
                className={`${className} bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-sm`}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Styling for other elements to match tailwind typography or custom look
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic mb-4 text-zinc-600 dark:text-zinc-400">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 border border-zinc-200 dark:border-zinc-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-700 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 whitespace-nowrap text-sm border-r border-zinc-200 dark:border-zinc-700 last:border-r-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

