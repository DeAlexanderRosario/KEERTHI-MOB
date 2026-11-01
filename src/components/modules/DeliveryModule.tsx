import React, { useState } from 'react';
import { Truck, FileText } from 'lucide-react';
import { DocTypeList } from '../doctype/DocTypeList';
import { DocTypeForm } from '../doctype/DocTypeForm';
import { DriverWorkspace } from '../vms/DriverWorkspace';

export function DeliveryModule() {
  const [activeTab, setActiveTab] = useState<'driver_portal' | 'Delivery Note' | 'Delivery Trip'>('driver_portal');
  const [editingDocName, setEditingDocName] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const tabs = [
    { key: 'driver_portal', label: 'Driver Delivery Portal', icon: Truck },
    { key: 'Delivery Trip', label: 'Delivery Trips (VMS)', icon: FileText },
    { key: 'Delivery Note', label: 'ERP Delivery Notes', icon: FileText },
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
        doctype={activeTab as string}
        docName={editingDocName}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setIsEditing(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#090B0A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'driver_portal' ? (
        <DriverWorkspace />
      ) : (
        <DocTypeList
          doctype={activeTab}
          onSelectDoc={(name) => handleOpenDoc(name)}
          onNewDoc={() => handleOpenDoc()}
        />
      )}
    </div>
  );
}
