import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Lock className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Tech Daily</h1>
              <p className="text-sm text-gray-500 mt-1">パスワードを入力してください</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-8 pt-4">
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm text-gray-700">
                パスワード
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full h-10 mt-2">
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
