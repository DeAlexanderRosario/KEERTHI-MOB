import React, { useState } from 'react';
import { DocTypeList } from '../doctype/DocTypeList';
import { DocTypeForm } from '../doctype/DocTypeForm';

export function HrModule() {
  const [activeDocType, setActiveDocType] = useState<string>('Employee');
  const [editingDocName, setEditingDocName] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const tabs = [
    { doctype: 'Employee', label: 'Employees Directory' },
    { doctype: 'Attendance', label: 'Daily Attendance' },
    { doctype: 'Leave Application', label: 'Leave Applications' },
  ];

  const handleOpenDoc = (name?: string) => {
    setEditingDocName(name);
    setIsEditing(true);
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingDocName(undefined);
  };

  if (isEditing) {
    return (
      <DocTypeForm
        doctype={activeDocType}
        docName={editingDocName}
        onBack={handleBack}
        onNavigateDoc={(dt, dn) => {
          setActiveDocType(dt);
          setEditingDocName(dn);
        }}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar scroll-smooth flex-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.doctype}
            onClick={() => {
              setActiveDocType(tab.doctype);
              setIsEditing(false);
            }}
            className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              activeDocType === tab.doctype
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DocTypeList
        doctype={activeDocType}
        onSelectDoc={(name) => handleOpenDoc(name)}
        onNewDoc={() => handleOpenDoc()}
      />
    </div>
  );
}
