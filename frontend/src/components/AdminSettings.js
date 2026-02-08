import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Baby, DollarSign, Edit, Plus, Save, Trash2, RefreshCw, Star, MessageSquare, TrendingUp, Settings } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminSettings = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("child-seats");
  
  // Child seat pricing state
  const [childSeats, setChildSeats] = useState([]);
  const [editingSeat, setEditingSeat] = useState(null);
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  
  // Currency rates state
  const [currencies, setCurrencies] = useState([]);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  
  // Ratings state
  const [ratings, setRatings] = useState([]);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSettings = useCallback(async () => {
    try {
      const [childSeatsRes, currenciesRes] = await Promise.all([
        axios.get(`${API}/admin/settings/child-seats`, { headers }),
        axios.get(`${API}/admin/settings/currencies`, { headers })
      ]);
      setChildSeats(childSeatsRes.data.child_seats || []);
      setCurrencies(currenciesRes.data.currencies || []);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchRatings = useCallback(async () => {
    setRatingsLoading(true);
    try {
      const [ratingsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/admin/ratings`, { headers }),
        axios.get(`${API}/admin/ratings/summary`, { headers })
      ]);
      setRatings(ratingsRes.data || []);
      setRatingSummary(summaryRes.data);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    } finally {
      setRatingsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (activeTab === "ratings") {
      fetchRatings();
    }
  }, [activeTab, fetchRatings]);

  // Child seat handlers
  const saveChildSeats = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings/child-seats`, { child_seats: childSeats }, { headers });
      toast.success("Child seat pricing saved successfully");
    } catch (error) {
      toast.error("Failed to save child seat pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSeat = () => {
    if (!editingSeat.name || editingSeat.price === undefined) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (editingSeat.isNew) {
      const newSeat = {
        id: editingSeat.id || editingSeat.name.toLowerCase().replace(/\s+/g, "_"),
        name: editingSeat.name,
        age_range: editingSeat.age_range || "",
        price: parseFloat(editingSeat.price) || 0,
        is_active: editingSeat.is_active !== false
      };
      setChildSeats([...childSeats, newSeat]);
    } else {
      setChildSeats(childSeats.map(s => s.id === editingSeat.id ? editingSeat : s));
    }
    
    setSeatDialogOpen(false);
    setEditingSeat(null);
  };

  const deleteSeat = (seatId) => {
    if (window.confirm("Are you sure you want to delete this child seat type?")) {
      setChildSeats(childSeats.filter(s => s.id !== seatId));
    }
  };

  // Currency handlers
  const saveCurrencies = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings/currencies`, { currencies }, { headers });
      toast.success("Currency rates saved successfully");
    } catch (error) {
      toast.error("Failed to save currency rates");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCurrency = () => {
    if (!editingCurrency.code || !editingCurrency.symbol || editingCurrency.rate === undefined) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (editingCurrency.isNew) {
      const newCurrency = {
        code: editingCurrency.code.toUpperCase(),
        symbol: editingCurrency.symbol,
        name: editingCurrency.name || editingCurrency.code,
        rate: parseFloat(editingCurrency.rate) || 1,
        is_active: editingCurrency.is_active !== false
      };
      setCurrencies([...currencies, newCurrency]);
    } else {
      setCurrencies(currencies.map(c => c.code === editingCurrency.code ? editingCurrency : c));
    }
    
    setCurrencyDialogOpen(false);
    setEditingCurrency(null);
  };

  const deleteCurrency = (code) => {
    if (code === "GBP") {
      toast.error("Cannot delete the base currency (GBP)");
      return;
    }
    if (window.confirm("Are you sure you want to delete this currency?")) {
      setCurrencies(currencies.filter(c => c.code !== code));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-settings">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          System Settings
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="child-seats" className="flex items-center gap-2">
            <Baby className="w-4 h-4" />
            Child Seats
          </TabsTrigger>
          <TabsTrigger value="currencies" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Currencies
          </TabsTrigger>
          <TabsTrigger value="ratings" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Ratings
          </TabsTrigger>
        </TabsList>

        {/* Child Seats Tab */}
        <TabsContent value="child-seats" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Baby className="w-5 h-5 text-[#D4AF37]" />
                Child Seat Pricing
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSeat({ isNew: true, is_active: true });
                    setSeatDialogOpen(true);
                  }}
                  data-testid="add-child-seat-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Seat Type
                </Button>
                <Button
                  size="sm"
                  onClick={saveChildSeats}
                  disabled={saving}
                  className="bg-[#0A0F1C]"
                  data-testid="save-child-seats-btn"
                >
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">
                Configure pricing for different child seat types. These prices are added to the booking total when customers select child seats during checkout.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat Type</TableHead>
                    <TableHead>Age Range</TableHead>
                    <TableHead>Price (GBP)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childSeats.map((seat) => (
                    <TableRow key={seat.id} data-testid={`child-seat-row-${seat.id}`}>
                      <TableCell className="font-medium">{seat.name}</TableCell>
                      <TableCell>{seat.age_range}</TableCell>
                      <TableCell className="font-bold text-[#D4AF37]">£{seat.price?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={seat.is_active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-600"}>
                          {seat.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSeat({ ...seat });
                              setSeatDialogOpen(true);
                            }}
                            data-testid={`edit-seat-${seat.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSeat(seat.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`delete-seat-${seat.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {childSeats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                        No child seat types configured. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                Currency Exchange Rates
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingCurrency({ isNew: true, is_active: true, rate: 1 });
                    setCurrencyDialogOpen(true);
                  }}
                  data-testid="add-currency-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Currency
                </Button>
                <Button
                  size="sm"
                  onClick={saveCurrencies}
                  disabled={saving}
                  className="bg-[#0A0F1C]"
                  data-testid="save-currencies-btn"
                >
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">
                Configure exchange rates relative to GBP (base currency). Customers can select their preferred currency during booking.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Rate (to GBP)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency) => (
                    <TableRow key={currency.code} data-testid={`currency-row-${currency.code}`}>
                      <TableCell className="font-medium">{currency.name}</TableCell>
                      <TableCell className="text-lg">{currency.symbol}</TableCell>
                      <TableCell className="font-mono">{currency.code}</TableCell>
                      <TableCell>
                        {currency.code === "GBP" ? (
                          <span className="text-zinc-500">1.00 (base)</span>
                        ) : (
                          <span className="font-bold">1 GBP = {currency.rate?.toFixed(4)} {currency.code}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={currency.is_active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-600"}>
                          {currency.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCurrency({ ...currency });
                              setCurrencyDialogOpen(true);
                            }}
                            data-testid={`edit-currency-${currency.code}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {currency.code !== "GBP" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCurrency(currency.code)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`delete-currency-${currency.code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {currencies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                        No currencies configured. Add GBP as the base currency to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ratings Tab */}
        <TabsContent value="ratings" className="space-y-4">
          {/* Summary Cards */}
          {ratingSummary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">Total Ratings</p>
                      <p className="text-2xl font-bold">{ratingSummary.total_ratings}</p>
                    </div>
                    <Star className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">Average Rating</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        {ratingSummary.average_rating}
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">With Comments</p>
                      <p className="text-2xl font-bold">{ratingSummary.ratings_with_comments}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-500">5-Star Ratings</p>
                      <p className="text-2xl font-bold text-green-600">{ratingSummary.rating_distribution?.["5"] || 0}</p>
                    </div>
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Ratings Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-[#D4AF37]" />
                Trip Ratings & Feedback
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchRatings} disabled={ratingsLoading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${ratingsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {ratingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A0F1C]"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratings.map((rating) => (
                      <TableRow key={rating.id}>
                        <TableCell className="whitespace-nowrap">{rating.pickup_date}</TableCell>
                        <TableCell className="font-mono text-sm">{rating.booking_ref}</TableCell>
                        <TableCell>{rating.customer_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {rating.driver_photo && (
                              <img src={rating.driver_photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                            )}
                            {rating.driver_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(i => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i <= rating.stars ? "text-yellow-500 fill-yellow-500" : "text-zinc-200"}`} 
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate text-sm text-zinc-600" title={rating.comment}>
                            {rating.comment || <span className="text-zinc-400 italic">No comment</span>}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                    {ratings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                          No ratings yet. Ratings appear here after customers rate their trips.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Child Seat Dialog */}
      <Dialog open={seatDialogOpen} onOpenChange={setSeatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeat?.isNew ? "Add Child Seat Type" : "Edit Child Seat Type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Seat Name *</Label>
              <Input
                value={editingSeat?.name || ""}
                onChange={(e) => setEditingSeat({ ...editingSeat, name: e.target.value })}
                placeholder="e.g., Infant Seat"
                data-testid="seat-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Age Range</Label>
              <Input
                value={editingSeat?.age_range || ""}
                onChange={(e) => setEditingSeat({ ...editingSeat, age_range: e.target.value })}
                placeholder="e.g., 0-12 months"
                data-testid="seat-age-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (GBP) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editingSeat?.price || ""}
                onChange={(e) => setEditingSeat({ ...editingSeat, price: parseFloat(e.target.value) || 0 })}
                placeholder="10.00"
                data-testid="seat-price-input"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editingSeat?.is_active !== false}
                onCheckedChange={(checked) => setEditingSeat({ ...editingSeat, is_active: checked })}
                data-testid="seat-active-switch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSeat} className="bg-[#0A0F1C]" data-testid="save-seat-btn">
              {editingSeat?.isNew ? "Add Seat Type" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Currency Dialog */}
      <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCurrency?.isNew ? "Add Currency" : "Edit Currency"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency Code *</Label>
                <Input
                  value={editingCurrency?.code || ""}
                  onChange={(e) => setEditingCurrency({ ...editingCurrency, code: e.target.value.toUpperCase() })}
                  placeholder="USD"
                  maxLength={3}
                  disabled={!editingCurrency?.isNew}
                  data-testid="currency-code-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Symbol *</Label>
                <Input
                  value={editingCurrency?.symbol || ""}
                  onChange={(e) => setEditingCurrency({ ...editingCurrency, symbol: e.target.value })}
                  placeholder="$"
                  maxLength={3}
                  data-testid="currency-symbol-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency Name</Label>
              <Input
                value={editingCurrency?.name || ""}
                onChange={(e) => setEditingCurrency({ ...editingCurrency, name: e.target.value })}
                placeholder="US Dollar"
                data-testid="currency-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Exchange Rate (1 GBP = X {editingCurrency?.code || "units"}) *</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={editingCurrency?.rate || ""}
                onChange={(e) => setEditingCurrency({ ...editingCurrency, rate: parseFloat(e.target.value) || 1 })}
                placeholder="1.27"
                disabled={editingCurrency?.code === "GBP"}
                data-testid="currency-rate-input"
              />
              {editingCurrency?.code === "GBP" && (
                <p className="text-xs text-zinc-500">GBP is the base currency and always has a rate of 1.00</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editingCurrency?.is_active !== false}
                onCheckedChange={(checked) => setEditingCurrency({ ...editingCurrency, is_active: checked })}
                data-testid="currency-active-switch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrencyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCurrency} className="bg-[#0A0F1C]" data-testid="save-currency-btn">
              {editingCurrency?.isNew ? "Add Currency" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
