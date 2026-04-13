import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-blue-100 text-blue-700 border-blue-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
};

export default function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={`border-transparent ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status || 'N/A'}
    </Badge>
  );
}
