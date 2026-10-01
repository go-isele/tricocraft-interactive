'use client';

import Link from 'next/link';
import RequireAuth from '@/components/dash/RequireAuth';
import BlogEditForm from '@/components/admin/BlogEditForm';

export default function NewBlogPostPage() {
  return (
    <RequireAuth role="admin" active="blog">
      <div className="crumbs" style={{ marginBottom: 18 }}><Link href="/admin/blog">Resources / Blog</Link> &nbsp;/&nbsp; New</div>
      <div className="dash-hd"><div><h1>New Post</h1></div></div>
      <BlogEditForm />
    </RequireAuth>
  );
}
