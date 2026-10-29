/**
 * Attachment & Link Search Service
 */

import { httpClient } from './httpClient';

export interface LinkSearchResult {
  value: string;
  description?: string;
}

class AttachmentService {
  /**
   * Searches Link options on the server using frappe.desk.search.search_link
   */
  public async searchLink(
    doctype: string,
    txt: string = '',
    filters: Record<string, any> = {},
    pageLength: number = 20
  ): Promise<LinkSearchResult[]> {
    const params = new URLSearchParams({
      doctype,
      txt,
      filters: JSON.stringify(filters),
      page_length: String(pageLength),
    });

    const res = await httpClient<Array<{ value: string; description?: string }>>(
      `/api/erp/search/link?${params.toString()}`
    );

    return res || [];
  }

  /**
   * Uploads a file and attaches to a document
   */
  public async upload(
    file: File,
    doctype?: string,
    docname?: string,
    fieldname?: string,
    isPrivate: boolean = false
  ): Promise<{ file_url: string; name: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (doctype) formData.append('doctype', doctype);
    if (docname) formData.append('docname', docname);
    if (fieldname) formData.append('fieldname', fieldname);
    formData.append('is_private', isPrivate ? '1' : '0');

    return httpClient<{ file_url: string; name: string }>(
      '/api/erp/attachments/upload',
      {
        method: 'POST',
        body: formData,
      }
    );
  }
}

export const attachmentService = new AttachmentService();
