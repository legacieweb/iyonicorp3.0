import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className, ...props }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={twMerge(clsx('w-full min-w-full divide-y divide-gray-200', className))}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className, ...props }) => {
  return (
    <thead className={twMerge(clsx('bg-gray-50', className))} {...props}>
      {children}
    </thead>
  );
};

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className, ...props }) => {
  return (
    <tbody className={twMerge(clsx('bg-white divide-y divide-gray-200', className))} {...props}>
      {children}
    </tbody>
  );
};

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className, ...props }) => {
  return (
    <tr
      className={twMerge(clsx('hover:bg-gray-50 transition-colors', className))}
      {...props}
    >
      {children}
    </tr>
  );
};

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className, ...props }) => {
  return (
    <th
      className={twMerge(
        clsx(
          'px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider',
          className
        )
      )}
      {...props}
    >
      {children}
    </th>
  );
};

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className, ...props }) => {
  return (
    <td
      className={twMerge(clsx('px-6 py-4 whitespace-nowrap text-sm text-gray-900', className))}
      {...props}
    >
      {children}
    </td>
  );
};
