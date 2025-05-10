
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "../ui/card";

interface TableSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  cellWidths?: string[]; // e.g., ["w-1/4", "w-1/2", "w-1/4"]
  showTableHeader?: boolean;
  headerTexts?: string[];
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rowCount = 5,
  columnCount = 4,
  cellWidths,
  showTableHeader = true,
  headerTexts,
  className,
}) => {
  const defaultCellWidth = `w-1/${columnCount}`;

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <Table>
          {showTableHeader && (
            <TableHeader>
              <TableRow>
                {Array.from({ length: columnCount }).map((_, i) => (
                  <TableHead key={i} className={cellWidths?.[i] ?? defaultCellWidth}>
                    {headerTexts?.[i] ? (
                      <Skeleton className="h-5 w-3/4 bg-muted" /> // Placeholder for text
                    ) : (
                      <Skeleton className="h-5 w-full bg-muted" />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <TableCell key={colIndex} className={cellWidths?.[colIndex] ?? defaultCellWidth}>
                    <Skeleton className="h-5 w-full bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
