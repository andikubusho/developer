import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  isLoading 
}) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-t border-slate-100">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          variant="outline"
        >
          Previous
        </Button>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          variant="outline"
          className="ml-3"
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-700">
            Halaman <span className="font-medium">{currentPage}</span> dari{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              variant="outline"
              className="rounded-l-md rounded-r-none px-2 py-2 h-auto"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            
            {startPage > 1 && (
              <>
                <Button
                  onClick={() => onPageChange(1)}
                  variant={currentPage === 1 ? 'default' : 'outline'}
                  className={cn(
                    "rounded-none h-auto px-4 py-2 text-sm font-semibold",
                    currentPage === 1 ? "z-10 bg-indigo-600 text-white" : "text-slate-900"
                  )}
                >
                  1
                </Button>
                {startPage > 2 && <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">...</span>}
              </>
            )}

            {pages.map((page) => (
              <Button
                key={page}
                onClick={() => onPageChange(page)}
                variant={currentPage === page ? 'default' : 'outline'}
                className={cn(
                  "rounded-none h-auto px-4 py-2 text-sm font-semibold",
                  currentPage === page ? "z-10 bg-indigo-600 text-white" : "text-slate-900"
                )}
              >
                {page}
              </Button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">...</span>}
                <Button
                  onClick={() => onPageChange(totalPages)}
                  variant={currentPage === totalPages ? 'default' : 'outline'}
                  className={cn(
                    "rounded-none h-auto px-4 py-2 text-sm font-semibold",
                    currentPage === totalPages ? "z-10 bg-indigo-600 text-white" : "text-slate-900"
                  )}
                >
                  {totalPages}
                </Button>
              </>
            )}

            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              variant="outline"
              className="rounded-r-md rounded-l-none px-2 py-2 h-auto"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};
