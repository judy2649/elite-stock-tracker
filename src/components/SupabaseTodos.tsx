import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.ts';

interface Todo {
  id: string;
  name: string;
  completed?: boolean;
}

/**
 * Example component demonstrating Supabase integration.
 * Adapted from the provided Next.js example for Vite/React.
 */
export default function SupabaseTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodos() {
      try {
        setLoading(true);
        setError(null);
        
        // Use the lazy-initialized client
        const { data, error } = await supabase
          .from('todos')
          .select('*');

        if (error) throw error;
        setTodos(data || []);
      } catch (err: any) {
        console.warn('Supabase fetch issue (expected if keys missing):', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTodos();
  }, []);

  if (loading) return <div className="p-4 text-zinc-500">Loading todos...</div>;
  if (error) return <div className="p-4 text-red-500 text-xs">Supabase Error: {error}</div>;

  return (
    <div className="p-4 bg-white rounded-lg border border-zinc-200">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        Supabase Todos (Live)
      </h3>
      <ul className="space-y-2">
        {todos.length === 0 ? (
          <li className="text-xs text-zinc-400 italic">No todos found in "todos" table.</li>
        ) : (
          todos.map((todo) => (
            <li key={todo.id} className="text-xs flex items-center gap-2 p-2 bg-zinc-50 rounded">
              <span className="font-mono text-zinc-400">#{todo.id.slice(0, 4)}</span>
              <span className="text-zinc-700 font-medium">{todo.name}</span>
            </li>
          ))
        )}
      </ul>
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-[10px] text-zinc-400 font-mono">SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL?.slice(0, 20)}...</span>
        <button 
          onClick={() => window.location.reload()}
          className="text-[10px] text-royal-600 hover:underline"
        >
          Refresh Sync
        </button>
      </div>
    </div>
  );
}
