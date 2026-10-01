'use client';

import { use } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/dash/RequireAuth';
import BlogEditForm from '@/components/admin/BlogEditForm';

export default function EditBlogPostPage({ params }) {
  const { id } = use(params);
  return (
    <RequireAuth role="admin" active="blog">
      <div className="crumbs" style={{ marginBottom: 18 }}><Link href="/admin/blog">Resources / Blog</Link> &nbsp;/&nbsp; Edit</div>
      <div className="dash-hd"><div><h1>Edit Post</h1></div></div>
      <BlogEditForm postId={id} />
    </RequireAuth>
  );
}
