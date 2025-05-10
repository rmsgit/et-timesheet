
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  hasHeader?: boolean;
  headerHeight?: string;
  headerWidth?: string;
  lineCount?: number;
  lineHeight?: string;
  lineWidth?: string | string[]; // Can be single width or array for varying widths
  hasFooter?: boolean;
  footerHeight?: string;
  footerWidth?: string;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  hasHeader = true,
  headerHeight = "h-6",
  headerWidth = "w-3/4",
  lineCount = 2,
  lineHeight = "h-4",
  lineWidth = "w-full",
  hasFooter = false,
  footerHeight = "h-6",
  footerWidth = "w-1/2",
  className,
}) => {
  return (
    <Card className={className}>
      {hasHeader && (
        <CardHeader>
          <Skeleton className={`${headerHeight} ${headerWidth} bg-muted`} />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lineCount }).map((_, i) => {
          const currentLineWidth = Array.isArray(lineWidth)
            ? lineWidth[i % lineWidth.length]
            : lineWidth;
          return (
            <Skeleton
              key={i}
              className={`${lineHeight} ${currentLineWidth} ${ i === lineCount -1 && Array.isArray(lineWidth) ? 'w-5/6' : ''} bg-muted`}
            />
          );
        })}
      </CardContent>
      {hasFooter && (
        <CardFooter>
          <Skeleton className={`${footerHeight} ${footerWidth} bg-muted`} />
        </CardFooter>
      )}
    </Card>
  );
};
