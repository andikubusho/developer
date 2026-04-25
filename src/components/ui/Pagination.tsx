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
    <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-t border-white/40 bg-white/10 backdrop-blur-glass-sm rounded-b-xl">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          variant="secondary"
          size="sm"
        >
          Previous
        </Button>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          variant="secondary"
          size="sm"
          className="ml-3"
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            Halaman <span className="font-bold text-text-primary">{currentPage}</span> dari{' '}
            <span className="font-bold text-text-primary">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex items-center gap-1" aria-label="Pagination">
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              variant="secondary"
              className="w-10 h-10 p-0"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            
            {startPage > 1 && (
              <>
                <Button
                  onClick={() => onPageChange(1)}
                  variant={currentPage === 1 ? 'primary' : 'secondary'}
                  className={cn("w-10 h-10 p-0 font-black", currentPage === 1 && "shadow-glass")}
                >
                  1
                </Button>
                {startPage > 2 && <span className="text-text-muted px-1">...</span>}
              </>
            )}

            {pages.map((page) => (
              <Button
                key={page}
                onClick={() => onPageChange(page)}
                variant={currentPage === page ? 'primary' : 'secondary'}
                className={cn("w-10 h-10 p-0 font-black", currentPage === page && "shadow-glass")}
              >
                {page}
              </Button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="text-text-muted px-1">...</span>}
                <Button
                  onClick={() => onPageChange(totalPages)}
                  variant={currentPage === totalPages ? 'primary' : 'secondary'}
                  className={cn("w-10 h-10 p-0 font-black", currentPage === totalPages && "shadow-glass")}
                >
                  {totalPages}
                </Button>
              </>
            )}

            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              variant="secondary"
              className="w-10 h-10 p-0"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};
