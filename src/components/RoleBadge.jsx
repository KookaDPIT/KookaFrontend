import { useTranslation } from 'react-i18next';
import './RoleBadge.css';

/* Small pill marking a moderator/admin account. Plain users get nothing —
   "user" is the default, so a badge for it would be noise. */
export default function RoleBadge({ role, className = '' }) {
  const { t } = useTranslation();
  if (role !== 'moderator' && role !== 'admin') return null;

  return (
    <span className={`rolebadge rolebadge--${role} ${className}`} title={t(`roles.${role}`)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6z" />
        {role === 'admin' && <path d="M9 12l2 2 4-4" />}
      </svg>
      {t(`roles.${role}`)}
    </span>
  );
}
