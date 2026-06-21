/**
 * Site pages API — public legal content and admin editing.
 */

import axios from 'axios';
import { apiClient } from './api';

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  body: string;
  metaDescription?: string;
  isPublished: boolean;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SitePageUpdatePayload {
  title: string;
  body: string;
  metaDescription?: string;
  isPublished?: boolean;
}

export const sitePagesApi = {
  async getPublicPage(slug: string): Promise<SitePage> {
    const { data } = await axios.get<{ success: boolean; page: SitePage }>(
      `/api/public/pages/${slug}`
    );
    return data.page;
  },

  async listAdminPages(): Promise<SitePage[]> {
    const { data } = await apiClient.get<{ success: boolean; pages: SitePage[] }>(
      '/admin/site-pages'
    );
    return data.pages;
  },

  async getAdminPage(slug: string): Promise<SitePage> {
    const { data } = await apiClient.get<{ success: boolean; page: SitePage }>(
      `/admin/site-pages/${slug}`
    );
    return data.page;
  },

  async updatePage(slug: string, payload: SitePageUpdatePayload): Promise<SitePage> {
    const { data } = await apiClient.put<{ success: boolean; page: SitePage }>(
      `/admin/site-pages/${slug}`,
      payload
    );
    return data.page;
  },
};

/** Known slugs mapped to public routes */
export const SITE_PAGE_ROUTES: Record<string, string> = {
  'privacy-policy': '/privacy',
  'pii-disclaimer': '/disclaimer',
};

export const ROUTE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SITE_PAGE_ROUTES).map(([slug, path]) => [path, slug])
);
