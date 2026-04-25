import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetStats, useGetRecentActivity } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Activity, CheckCircle, AlertTriangle, FileAudio, FileImage, File, Type } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatsCard({ title, value, description, icon: Icon, loading }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-1" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your accessible learning materials.</p>
        </div>
        <Button asChild size="lg" className="rounded-full shadow-sm hover-elevate">
          <Link href="/upload" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Upload Material
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Documents" 
          value={stats?.totalDocuments ?? 0}
          description={`${stats?.documentsThisWeek ?? 0} added this week`}
          icon={FileText}
          loading={statsLoading}
        />
        <StatsCard 
          title="Avg. Accessibility Score" 
          value={`${stats?.averageAccessibilityScore ?? 0}%`}
          description="Across all materials"
          icon={Activity}
          loading={statsLoading}
        />
        <StatsCard 
          title="Issues Fixed" 
          value={stats?.totalIssuesFixed ?? 0}
          description="Automated & manual fixes"
          icon={CheckCircle}
          loading={statsLoading}
        />
        <StatsCard 
          title="Pending Issues" 
          value="-"
          description="Needs attention"
          icon={AlertTriangle}
          loading={statsLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Accessibility Scores</CardTitle>
            <CardDescription>Distribution of scores across your library</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.scoreDistribution || []}>
                    <XAxis dataKey="bucket" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                    <Bar dataKey="count" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Source Types</CardTitle>
            <CardDescription>Format breakdown of uploaded content</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.documentsBySourceType || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="sourceType"
                    >
                      {stats?.documentsBySourceType?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
              {stats?.documentsBySourceType?.map((entry: any, index: number) => (
                <div key={entry.sourceType} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="capitalize">{entry.sourceType}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates to your materials</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-3 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="space-y-8">
              {activity.map((item: any) => {
                let Icon = FileText;
                if (item.action.includes('audio')) Icon = FileAudio;
                if (item.action.includes('image')) Icon = FileImage;
                if (item.action.includes('caption')) Icon = Type;

                return (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-full">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        <Link href={`/document/${item.documentId}`} className="hover:underline text-primary">
                          {item.documentTitle}
                        </Link>
                      </p>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity.
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
