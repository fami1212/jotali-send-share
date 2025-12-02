import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface ImagePreviewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImagePreviewDialog = ({ imageUrl, onClose }: ImagePreviewDialogProps) => {
  if (!imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={handleDownload}
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewDialog;
