import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Clock, X, RefreshCw, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
interface Batch {
  batch_id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_articles: number;
  completed_articles: number;
  failed_articles: number;
  progress_percentage: number;
  created_at: string;
  completed_at?: string;
}

interface BatchArticle {
  id: number;
  topic: string;
  status: string;
  error_message?: string;
  word_count_actual?: number;
  processing_time_minutes?: number;
}

const BulkGenerator: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);

  const apiUrl = import.meta.env.DEV
    ? "http://localhost:2024"
    : window.location.origin;

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/bulk/batches`);
      if (response.ok) {
        const data = await response.json();
        setBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  }, [apiUrl]);

  // Fetch batch details
  const fetchBatchDetails = async (batchId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/bulk/batch/${batchId}`);
      if (response.ok) {
        const data = await response.json();
        setBatchDetails(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
    }
    return null;
  };

  // Auto-refresh for processing batches
  useEffect(() => {
    fetchBatches();
    
    const interval = setInterval(() => {
      const hasProcessing = batches.some(b => b.status === 'processing' || b.status === 'pending');
      if (hasProcessing) {
        fetchBatches();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [batches, fetchBatches]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const response = await fetch(`${apiUrl}/api/bulk/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadSuccess(`Batch created successfully! ${data.total_articles} articles queued for processing.`);
        fetchBatches();
      } else {
        setUploadError(data.detail || 'Upload failed');
      }
    } catch (error) {
      setUploadError('Error uploading file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Download batch results
  const downloadBatch = async (batchId: string, format: 'csv' | 'xlsx' | 'json' | 'markdown' | 'html' = 'csv') => {
    try {
      const response = await fetch(`${apiUrl}/api/bulk/batch/${batchId}/download?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Set appropriate extension based on format
        const extension = format === 'markdown' || format === 'html' ? 'zip' : format;
        a.download = `${batchId}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading batch:', error);
    }
  };

  // Download template
  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      const response = await fetch(`${apiUrl}/api/bulk/template?format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `article_batch_template.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  // Cancel batch
  const cancelBatch = async (batchId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/bulk/batch/${batchId}/cancel`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchBatches();
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
    }
  };

  // View single article
  const viewArticle = async (batchId: string, articleId: number) => {
    try {
      const response = await fetch(`${apiUrl}/api/bulk/batch/${batchId}/article/${articleId}`);
      if (response.ok) {
        const article = await response.json();
        setSelectedArticle(article);
        setShowArticleModal(true);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    }
  };

  // Copy article to clipboard
  const copyToClipboard = () => {
    if (!selectedArticle) return;

    // Format for Google Docs - include title and content
    const formattedContent = `${selectedArticle.title}\n\n${selectedArticle.content}`;

    navigator.clipboard.writeText(formattedContent).then(() => {
      // Show success message
      alert('Article copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // View batch details
  const viewBatchDetails = async (batch: Batch) => {
    const details = await fetchBatchDetails(batch.batch_id);
    if (details) {
      setBatchDetails(details);
      setShowDetailsDialog(true);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      processing: { color: 'bg-blue-500', icon: Loader2 },
      completed: { color: 'bg-green-500', icon: CheckCircle },
      failed: { color: 'bg-red-500', icon: AlertCircle },
      cancelled: { color: 'bg-gray-500', icon: X },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bulk Article Generator</h1>
        <p className="text-gray-600">Upload CSV or Excel files to generate multiple articles at once</p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Articles</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file with article topics and parameters. Maximum 100 articles per batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Download Templates */}
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('csv')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('xlsx')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Excel Template
              </Button>
            </div>

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  {isUploading ? 'Uploading...' : 'Drop your file here or click to browse'}
                </p>
                <p className="text-sm text-gray-500">Supports CSV and Excel files</p>
              </label>
            </div>

            {/* Upload Messages */}
            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
            {uploadSuccess && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{uploadSuccess}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batches List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Batches</CardTitle>
              <CardDescription>Track and download your article batches</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRefreshing(true);
                fetchBatches().then(() => setIsRefreshing(false));
              }}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No batches yet. Upload a file to get started!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.batch_id}>
                    <TableCell className="font-medium">{batch.name}</TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      <div className="w-32">
                        <Progress value={batch.progress_percentage} className="h-2" />
                        <span className="text-xs text-gray-500">
                          {Math.round(batch.progress_percentage)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-green-600">{batch.completed_articles}</span>
                        {batch.failed_articles > 0 && (
                          <span className="text-red-600"> / {batch.failed_articles}</span>
                        )}
                        <span className="text-gray-500"> / {batch.total_articles}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(batch.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewBatchDetails(batch)}
                        >
                          View
                        </Button>
                        {batch.status === 'completed' && batch.completed_articles > 0 && (
                          <div className="flex gap-1">
                            <select
                              className="text-xs border rounded px-2 py-1"
                              onChange={(e) => downloadBatch(batch.batch_id, e.target.value as any)}
                              defaultValue=""
                            >
                              <option value="" disabled>Download...</option>
                              <option value="csv">CSV</option>
                              <option value="xlsx">Excel</option>
                              <option value="json">JSON</option>
                              <option value="markdown">Markdown (ZIP)</option>
                              <option value="html">HTML (ZIP)</option>
                            </select>
                          </div>
                        )}
                        {(batch.status === 'pending' || batch.status === 'processing') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelBatch(batch.batch_id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Batch Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{batchDetails?.name}</DialogTitle>
            <DialogDescription>
              Batch ID: {batchDetails?.batch_id}
            </DialogDescription>
          </DialogHeader>
          {batchDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Status:</span> {getStatusBadge(batchDetails.status)}
                </div>
                <div>
                  <span className="font-medium">Progress:</span> {Math.round(batchDetails.progress_percentage)}%
                </div>
                <div>
                  <span className="font-medium">Total Articles:</span> {batchDetails.total_articles}
                </div>
                <div>
                  <span className="font-medium">Completed:</span> {batchDetails.completed_articles}
                </div>
              </div>

              {batchDetails.articles && batchDetails.articles.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Articles</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Word Count</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchDetails.articles.map((article: BatchArticle) => (
                        <TableRow key={article.id}>
                          <TableCell className="max-w-xs truncate">{article.topic}</TableCell>
                          <TableCell>{getStatusBadge(article.status)}</TableCell>
                          <TableCell>{article.word_count_actual || '-'}</TableCell>
                          <TableCell>
                            {article.processing_time_minutes
                              ? `${article.processing_time_minutes.toFixed(1)} min`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {article.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewArticle(batchDetails.batch_id, article.id)}
                              >
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {batchDetails.status === 'completed' && batchDetails.completed_articles > 0 && (
                <div className="flex gap-2">
                  <Button onClick={() => downloadBatch(batchDetails.batch_id, 'csv')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button onClick={() => downloadBatch(batchDetails.batch_id, 'xlsx')} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Excel
                  </Button>
                  <Button onClick={() => downloadBatch(batchDetails.batch_id, 'json')} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Article Viewer Modal */}
      <Dialog open={showArticleModal} onOpenChange={setShowArticleModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArticle?.title || 'Article'}</DialogTitle>
            <DialogDescription>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Topic: {selectedArticle?.topic}</span>
                <span>Words: {selectedArticle?.word_count}</span>
                <span>Tone: {selectedArticle?.tone}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedArticle && (
            <div className="space-y-4">
              {/* Copy button */}
              <div className="flex justify-end">
                <Button onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Article
                </Button>
              </div>

              {/* Article content */}
              <div className="prose max-w-none">
                <div className="border rounded-lg p-6 bg-white">
                  <h1 className="text-2xl font-bold mb-4">{selectedArticle.title}</h1>
                  <div className="whitespace-pre-wrap">{selectedArticle.content}</div>
                </div>
              </div>

              {/* Keywords if present */}
              {selectedArticle.keywords && (
                <div className="text-sm text-gray-600">
                  <strong>Keywords:</strong> {selectedArticle.keywords}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArticleModal(false)}>
              Close
            </Button>
            <Button onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkGenerator;