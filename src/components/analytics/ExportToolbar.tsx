import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toaster';
import { Printer } from 'lucide-react';

interface Props {
  onPrint?: () => void;
}

export default function ExportToolbar({ onPrint }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onPrint && (
        <Button onClick={onPrint} className="h-8 text-xs">
          <Printer className="mr-1 h-3.5 w-3.5" />
          打印预览
        </Button>
      )}
    </div>
  );
}