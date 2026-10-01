'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function BlogEditForm({ postId }) {
  const router = useRouter();
  const [post, setPost] = useState(postId ? null : {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (postId) {
      apiFetch(`/api/admin/blog/${postId}`).then((d) => setPost(d.post)).catch(() => setPost({}));
    }
  }, [postId]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const form = e.target;
    try {
      await apiFetch('/api/admin/blog/save', {
        method: 'POST',
        body: JSON.stringify({
          id: postId || undefined,
          title: form.title.value,
          slug: form.slug.value,
          eyebrow: form.eyebrow.value,
          excerpt: form.excerpt.value,
          meta_description: form.meta_description.value,
          read_minutes: form.read_minutes.value,
          body_html: form.body_html.value,
        }),
      });
      router.push('/admin/blog');
    } finally {
      setSaving(false);
    }
  }

  if (!post) return null;

  return (
    <div className="card">
      <form onSubmit={onSubmit}>
        <div className="field"><label>Title</label><input type="text" name="title" required defaultValue={post.title || ''} /></div>
        <div className="field"><label>Slug (URL path)</label><input type="text" name="slug" required defaultValue={post.slug || ''} placeholder="production-marketplace-guide" /></div>
        <div className="field"><label>Eyebrow / Category Tag</label><input type="text" name="eyebrow" defaultValue={post.eyebrow || 'Getting Started'} /></div>
        <div className="field"><label>Excerpt</label><textarea name="excerpt" defaultValue={post.excerpt || ''} /></div>
        <div className="field"><label>Meta Description (SEO)</label><textarea name="meta_description" defaultValue={post.meta_description || ''} /></div>
        <div className="field"><label>Read Time (minutes)</label><input type="number" name="read_minutes" defaultValue={post.read_minutes || 5} /></div>
        <div className="field"><label>Body (HTML)</label><textarea name="body_html" style={{ minHeight: 340, fontFamily: 'monospace', fontSize: 12.5 }} required defaultValue={post.body_html || ''} /></div>
        <button className="btn btn-primary btn-block" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Post'}</button>
      </form>
    </div>
  );
}
