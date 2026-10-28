import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { MONTH_NAMES } from '../../lib/formatters';

interface MonthYearPickerProps {
  year: number;
  month: number; // 1-12
  onChange: (year: number, month: number) => void;
}

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({ year, month, onChange }) => {
  const handlePrevMonth = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  return (
    <div className="inline-flex items-center bg-white border border-surface-border rounded-lg p-1 shadow-2xs">
      <button
        onClick={handlePrevMonth}
        className="p-1.5 rounded-md hover:bg-slate-100 text-content-secondary hover:text-content-primary transition-colors"
        title="Previous Month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 px-3 py-1 font-semibold text-sm text-content-primary">
        <Calendar className="w-4 h-4 text-brand-600" />
        <span>
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>

      <button
        onClick={handleNextMonth}
        className="p-1.5 rounded-md hover:bg-slate-100 text-content-secondary hover:text-content-primary transition-colors"
        title="Next Month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

