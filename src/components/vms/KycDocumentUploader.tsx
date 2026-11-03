import React, { useState } from 'react';
import {
  FileCheck,
  Camera,
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  X,
  CreditCard,
  Plus,
} from 'lucide-react';
import { KycDocument, KycDocumentType } from '../../services/vmsService';

interface KycDocumentUploaderProps {
  documents: KycDocument[];
  onDocumentsChange: (docs: KycDocument[]) => void;
  isManagerView?: boolean;
  onUpdateStatus?: (docId: string, status: KycDocument['verification_status'], remarks?: string) => void;
}

const DOCUMENT_TYPES: KycDocumentType[] = [
  'PAN Card',
  'GST Certificate',
  'Masked Aadhaar',
  'Voter ID',
  'Driving Licence',
  'Passport',
];

export function KycDocumentUploader({
  documents,
  onDocumentsChange,
  isManagerView = false,
  onUpdateStatus,
}: KycDocumentUploaderProps) {
  const [selectedDocType, setSelectedDocType] = useState<KycDocumentType>('PAN Card');
  const [docNumber, setDocNumber] = useState<string>('');
  const [frontImage, setFrontImage] = useState<string>('');
  const [backImage, setBackImage] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // Handle Front Document File
  const handleFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFrontImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle Back Document File
  const handleBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBackImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Add Document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontImage) {
      alert('Front document photo is required.');
      return;
    }

    const newDoc: KycDocument = {
      id: `KYC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      document_type: selectedDocType,
      document_number: docNumber.trim() || undefined,
      front_photo_url: frontImage,
      back_photo_url: backImage || undefined,
      uploaded_at: new Date().toISOString(),
      verification_status: 'Pending',
    };

    onDocumentsChange([...documents, newDoc]);
    setFrontImage('');
    setBackImage('');
    setDocNumber('');
    setIsAddingNew(false);
  };

  // Remove Document
  const handleRemove = (id: string) => {
    onDocumentsChange(documents.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0B4025]" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            Government Identity Proofs & KYC ({documents.length})
          </h4>
        </div>
        {!isAddingNew && (
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#20D52E]" />
            <span>Add Identity Proof</span>
          </button>
        )}
      </div>

      {/* Add Document Form Modal / Drawer */}
      {isAddingNew && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-800" />
              <span>Attach New Identity Proof / Document</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600 text-xs p-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Document Category</label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as KycDocumentType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-semibold text-slate-900"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Document Number (Optional / Masked)
              </label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F or XXXXXX-1234"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none font-mono"
              />
            </div>
          </div>

          {/* Front & Back Photo Uploaders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Front Photo */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-700 block">
                Front Side Photo <span className="text-rose-500">*</span>
              </span>
              {frontImage ? (
                <div className="relative h-28 rounded-lg overflow-hidden border border-slate-300 bg-black group">
                  <img src={frontImage} alt="Front" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFrontImage('')}
                    className="absolute top-1.5 right-1.5 bg-black/70 text-rose-400 hover:text-rose-200 p-1 rounded-full text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="h-28 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#20D52E] flex flex-col items-center justify-center text-slate-500 cursor-pointer bg-white transition-colors group">
                  <Camera className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 mb-1" />
                  <span className="text-xs font-semibold">Capture Front Photo</span>
                  <span className="text-[10px] text-slate-400">Camera or Gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFrontUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Back Photo */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-700 block">
                Back Side Photo (Optional)
              </span>
              {backImage ? (
                <div className="relative h-28 rounded-lg overflow-hidden border border-slate-300 bg-black group">
                  <img src={backImage} alt="Back" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setBackImage('')}
                    className="absolute top-1.5 right-1.5 bg-black/70 text-rose-400 hover:text-rose-200 p-1 rounded-full text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="h-28 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#20D52E] flex flex-col items-center justify-center text-slate-500 cursor-pointer bg-white transition-colors group">
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-700 mb-1" />
                  <span className="text-xs font-semibold">Capture Back Photo</span>
                  <span className="text-[10px] text-slate-400">Address / Stamp page</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleBackUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddDocument}
              disabled={!frontImage}
              className="px-4 py-1.5 bg-[#20D52E] hover:bg-[#1db829] text-slate-950 rounded-lg text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              Attach Document
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      {documents.length === 0 && !isAddingNew ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-400 text-xs">
          <FileCheck className="w-6 h-6 mx-auto mb-1 text-slate-300" />
          <span>No identity documents attached yet. Click "Add Identity Proof" to upload PAN, GST, or Aadhaar.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isVerified = doc.verification_status === 'Verified';
            const isRejected = doc.verification_status === 'Rejected';
            const isPending = doc.verification_status === 'Pending' || doc.verification_status === 'Under Review';

            return (
              <div
                key={doc.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setPreviewImage(doc.front_photo_url)}
                    className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer relative group"
                  >
                    <img src={doc.front_photo_url} alt={doc.document_type} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-slate-900">{doc.document_type}</h5>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isVerified
                            ? 'bg-emerald-100 text-emerald-800'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {doc.verification_status}
                      </span>
                    </div>
                    {doc.document_number && (
                      <span className="font-mono text-slate-500 text-[11px] block">
                        Doc No: {doc.document_number}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPreviewImage(doc.front_photo_url)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  {doc.back_photo_url && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(doc.back_photo_url!)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      (Back)
                    </button>
                  )}

                  {!isManagerView && (
                    <button
                      type="button"
                      onClick={() => handleRemove(doc.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Manager verification quick controls */}
                  {isManagerView && onUpdateStatus && isPending && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(doc.id, 'Verified')}
                        className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(doc.id, 'Rejected', 'Document unclear or invalid')}
                        className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Image Zoom Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-xl w-full bg-[#090B0A] rounded-2xl overflow-hidden border border-slate-700 p-2 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Identity Proof" className="w-full max-h-[75vh] object-contain rounded-xl" />
            <div className="p-3 text-center text-xs text-slate-300 font-medium">
              Confidential KYC Document • Restricted Access & Audit Logged
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
