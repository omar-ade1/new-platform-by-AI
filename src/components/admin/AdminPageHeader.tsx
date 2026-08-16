import Link from "next/link";
import type { ReactNode } from "react";

export type AdminBreadcrumb = { label: string; href?: string };

// شريط رأس ثابت الشكل لكل صفحات لوحة التحكم: مكانك بالظبط (breadcrumb) + عنوان الصفحة + الفعل
// الأساسي فيها (دايمًا في نفس المكان أعلى يمين). الهدف إن عادل يعرف مكانه فورًا وهو بيتنقل
// في شجرة متداخلة (دورة › قسم › وحدة › أسئلة) من غير ما يتوه.
export default function AdminPageHeader({
  breadcrumb,
  title,
  description,
  action,
}: {
  breadcrumb?: AdminBreadcrumb[];
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6 mb-7 border-b border-ink/10">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink/40 mb-2">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-ink/25">/</span>}
                {b.href ? (
                  <Link href={b.href} className="hover:text-primary transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink/60">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display font-bold text-2xl text-primary break-words">{title}</h1>
        {description && <p className="text-base text-ink/50 mt-1.5 break-words">{description}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2.5">{action}</div>}
    </div>
  );
}
