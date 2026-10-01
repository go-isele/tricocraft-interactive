'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function AdminBlogList() {
  const [posts, setPosts] = useState(null);

  function load() {
    apiFetch('/api/admin/blog').then((d) => setPosts(d.posts)).catch(() => setPosts([]));
  }

  useEffect(() => { load(); }, []);

  async function onDelete(id) {
    if (!confirm('Delete this post permanently?')) return;
    await apiFetch(`/api/admin/blog/${id}/delete`, { method: 'POST' });
    load();
  }

  if (!posts) return null;

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Slug</th><th>Published</th><th></th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td><code>/resources/{p.slug}</code></td>
                <td>{new Date(p.published_at).toLocaleDateString('en-KE')}</td>
                <td>
                  <Link className="btn btn-outline btn-sm" href={`/admin/blog/${p.id}/edit`}>Edit</Link>{' '}
                  <Link className="btn btn-outline btn-sm" href={`/resources/${p.slug}`} target="_blank">View</Link>{' '}
                  <button className="btn btn-outline btn-sm" type="button" onClick={() => onDelete(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
