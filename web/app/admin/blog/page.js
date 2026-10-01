'use client';

import Link from 'next/link';
import RequireAuth from '@/components/dash/RequireAuth';
import AdminBlogList from '@/components/admin/AdminBlogList';

export default function AdminBlogPage() {
  return (
    <RequireAuth role="admin" active="blog">
      <div className="dash-hd">
        <div><h1>Resources / Blog</h1><p>Manage what&rsquo;s published under /resources.</p></div>
        <Link className="btn btn-primary" href="/admin/blog/new">+ New Post</Link>
      </div>
      <AdminBlogList />
    </RequireAuth>
  );
}
