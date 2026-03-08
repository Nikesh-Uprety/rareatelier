import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  fetchAdminAttributes, 
  createAdminAttribute, 
  deleteAdminAttribute,
  ProductAttribute 
} from "@/lib/adminApi";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Palette, Ruler } from "lucide-react";

export default function AdminAttributes() {
  const { toast } = useToast();
  const [newValue, setNewValue] = useState("");
  const [activeTab, setActiveTab] = useState("color");

  const { data: attributes, isLoading } = useQuery<ProductAttribute[]>({
    queryKey: ["admin", "attributes"],
    queryFn: () => fetchAdminAttributes(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { type: string; value: string }) => createAdminAttribute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "attributes"] });
      setNewValue("");
      toast({
        title: "Success",
        description: "Attribute created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminAttribute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "attributes"] });
      toast({
        title: "Success",
        description: "Attribute deleted successfully",
      });
    },
  });

  const handleAddAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    createMutation.mutate({ type: activeTab, value: newValue.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredAttributes = attributes?.filter(a => a.type === activeTab) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-tight">Product Attributes</h1>
        <p className="text-muted-foreground mt-2">Manage available colors and sizes for your products.</p>
      </div>

      <Tabs defaultValue="color" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="color" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="size" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Sizes
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-sm bg-white dark:bg-card">
          <CardHeader>
            <CardTitle>{activeTab === "color" ? "Colors" : "Sizes"}</CardTitle>
            <CardDescription>
              Add or remove {activeTab === "color" ? "color" : "size"} options that will appear in product management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAddAttribute} className="flex gap-4">
              <Input
                placeholder={`Add new ${activeTab === "color" ? "color (e.g. Jet Black)" : "size (e.g. XL)"}...`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="max-w-md bg-muted/50 focus:bg-white transition-colors"
                disabled={createMutation.isPending}
              />
              <Button type="submit" disabled={createMutation.isPending || !newValue.trim()}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add {activeTab === "color" ? "Color" : "Size"}
              </Button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAttributes.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  No {activeTab} attributes found. Add your first one above.
                </div>
              ) : (
                filteredAttributes.map((attr) => (
                  <div 
                    key={attr.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-muted/10 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {activeTab === "color" && (
                        <div 
                          className="w-4 h-4 rounded-full border border-black/10" 
                          style={{ backgroundColor: attr.value.toLowerCase().replace(/\s/g, '') }}
                        />
                      )}
                      <span className="font-medium">{attr.value}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(attr.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
