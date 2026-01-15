import React from 'react';

export default function InfoBadge({ icon: Icon, label, colorClass }: { icon: React.ElementType, label: string, colorClass?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border-2 border-black font-medium ${colorClass || 'bg-gray-200 text-gray-700'}`}
         style={{ fontFamily: 'var(--font-body)', boxShadow: '1px 1px 0px var(--color-border)' }}>
      <Icon size={14} />
      <span>{label}</span>
    </div>
  );
}
