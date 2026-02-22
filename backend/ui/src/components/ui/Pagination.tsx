import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((pageNum, idx) => (
          typeof pageNum === 'number' ? (
            <button
              key={idx}
              onClick={() => onChange(pageNum)}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors
                ${page === pageNum 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {pageNum}
            </button>
          ) : (
            <span key={idx} className="px-2 text-slate-400">...</span>
          )
        ))}
      </div>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
      >
        <ChevronRight size={16} />
      </button>
      
      <span className="text-sm text-slate-400 ml-2">
        共 {total} 条
      </span>
    </div>
  );
}
