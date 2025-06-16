
"use client";

import React, { useState, useMemo } from 'react';
import { useEditorLevels } from '@/hooks/useEditorLevels';
import type { EditorLevel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, Eye, Library, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const LevelCardSkeleton: React.FC = () => (
  <Card className="shadow-md">
    <CardHeader>
      <Skeleton className="h-6 w-3/4 bg-muted" />
      <Skeleton className="h-4 w-1/2 bg-muted mt-1" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full bg-muted" />
      <Skeleton className="h-4 w-5/6 bg-muted mt-2" />
      <Skeleton className="h-4 w-4/6 bg-muted mt-2" />
    </CardContent>
    <CardFooter>
      <Skeleton className="h-10 w-32 bg-muted" />
    </CardFooter>
  </Card>
);

export default function BrowseLevelsPage() {
  const { editorLevels, isLoadingEditorLevels } = useEditorLevels();
  const [selectedLevel, setSelectedLevel] = useState<EditorLevel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Levels are already sorted by 'order' from the hook
  const sortedLevels = useMemo(() => editorLevels, [editorLevels]);

  const handleViewDescription = (level: EditorLevel) => {
    setSelectedLevel(level);
    setIsDialogOpen(true);
  };

  if (isLoadingEditorLevels) {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Library className="mr-3 h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editor Proficiency Levels</h1>
            <p className="text-muted-foreground">Discover the different editing tiers and their descriptions.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <LevelCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center mb-6">
          <Library className="mr-3 h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editor Proficiency Levels</h1>
            <p className="text-muted-foreground">Discover the different editing tiers and their descriptions.</p>
          </div>
        </div>

      {sortedLevels.length === 0 ? (
        <Card className="shadow-md text-center py-10">
          <CardContent>
            <Award className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">No Editor Levels Defined</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Editor proficiency levels have not been set up yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedLevels.map((level) => (
            <Card key={level.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Award className="mr-2 h-5 w-5 text-primary" /> {level.name}
                </CardTitle>
                <CardDescription>Order: {level.order + 1}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div
                  className="line-clamp-3 text-sm text-muted-foreground ProseMirror-display-preview"
                  dangerouslySetInnerHTML={{ __html: level.description || "No description available." }}
                />
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleViewDescription(level)} variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" /> View Full Description
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedLevel && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center text-2xl">
                 <Award className="mr-2 h-6 w-6 text-primary" /> {selectedLevel.name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-grow my-4 pr-4">
              <div
                className="ProseMirror-display-preview prose dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: selectedLevel.description || "No description provided." }}
              />
            </ScrollArea>
            <DialogFooter className="mt-auto pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
