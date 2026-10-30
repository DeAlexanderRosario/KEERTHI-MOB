import React, { useState } from 'react';
import { DocTypeList } from '../doctype/DocTypeList';
import { DocTypeForm } from '../doctype/DocTypeForm';

interface StockModuleProps {
  initialDocType?: string;
  initialDocName?: string;
}

export function StockModule({ initialDocType = 'Item', initialDocName }: StockModuleProps) {
  const [activeDocType, setActiveDocType] = useState<string>(initialDocType);
  const [editingDocName, setEditingDocName] = useState<string | undefined>(initialDocName);
  const [isEditing, setIsEditing] = useState<boolean>(Boolean(initialDocName));

  const tabs = [
    { doctype: 'Item', label: 'Items Catalog' },
    { doctype: 'Warehouse', label: 'Warehouses' },
    { doctype: 'Stock Entry', label: 'Stock Entries' },
    { doctype: 'Delivery Note', label: 'Delivery Notes' },
    { doctype: 'Purchase Receipt', label: 'Purchase Receipts' },
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
