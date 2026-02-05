import { Card, CardContent } from "../ui/card";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-[#0A0F1C]">{value}</p>
        </div>
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default StatCard;
