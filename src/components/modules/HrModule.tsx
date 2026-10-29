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
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.doctype}
            onClick={() => {
              setActiveDocType(tab.doctype);
              setIsEditing(false);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeDocType === tab.doctype
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
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
