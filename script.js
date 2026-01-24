// URL'den veri çekme
function loadDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    
    if (data) {
        try {
            const invoiceData = JSON.parse(decodeURIComponent(data));
            fillInvoiceForm(invoiceData);
        } catch (e) {
            console.error('Veri yükleme hatası:', e);
        }
    }
}

function fillInvoiceForm(data) {
    // Müşteri bilgileri
    document.getElementById('clientName').value = data.customerName || '';
    document.getElementById('clientAddress').value = data.address || '';
    
    // Bugünün tarihi
    document.getElementById('invoiceDate').valueAsDate = new Date();
    
    // Ürünleri ekle
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.innerHTML = ''; // Temizle
    
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            addItemRowWithData(item);
        });
    } else {
        addItemRow(); // Boş satır
    }
    
    // Önizlemeyi güncelle
    calculateTotals();
    updatePreview();
}

function addItemRowWithData(itemData) {
    const rowId = Date.now() + Math.random();
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = rowId;
    
    row.innerHTML = `
        <input type="text" class="item-desc" placeholder="Ürün/Hizmet Adı" value="${itemData.product || ''}">
        <input type="number" class="item-qty" placeholder="Adet" value="${itemData.quantity || 1}" min="1">
        <input type="number" class="item-price" placeholder="Birim Fiyat" value="${itemData.pricePerKg || 0}" min="0" step="0.01">
        <input type="number" class="item-vat" placeholder="KDV%" value="20" min="0" max="100">
        <button type="button" class="remove-btn" title="Sil">&times;</button>
    `;

    row.querySelector('.remove-btn').addEventListener('click', () => {
        if (document.querySelectorAll('.item-row').length > 1) {
            row.remove();
            calculateTotals();
            updatePreview();
        } else {
            alert("En az bir satır olmalıdır.");
        }
    });

    document.getElementById('itemsContainer').appendChild(row);
}

document.addEventListener('DOMContentLoaded', () => {
    // URL'den veri yükle
    loadDataFromURL();
    
    // Set default invoice date to today
    document.getElementById('invoiceDate').valueAsDate = new Date();

    const itemsContainer = document.getElementById('itemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');
    const invoiceForm = document.getElementById('invoiceForm');
    const downloadBtn = document.getElementById('downloadBtn');

    // Add initial empty row only if no data loaded
    if (itemsContainer.children.length === 0) {
        addItemRow();
    }
    
    // Initial Preview Update
    updatePreview();

    // Event Listeners
    addItemBtn.addEventListener('click', addItemRow);
    
    // Listen to all inputs for real-time calculation & preview
    invoiceForm.addEventListener('input', () => {
        calculateTotals();
        updatePreview();
    });

    downloadBtn.addEventListener('click', generatePDF);

    function addItemRow() {
        const rowId = Date.now();
        const row = document.createElement('div');
        row.className = 'item-row';
        row.dataset.id = rowId;
        
        row.innerHTML = `
            <input type="text" class="item-desc" placeholder="Ürün/Hizmet Adı">
            <input type="number" class="item-qty" placeholder="Adet" value="1" min="1">
            <input type="number" class="item-price" placeholder="Birim Fiyat" min="0" step="0.01">
            <input type="number" class="item-vat" placeholder="KDV%" value="20" min="0" max="100">
            <button type="button" class="remove-btn" title="Sil">&times;</button>
        `;

        // Add delete functionality
        row.querySelector('.remove-btn').addEventListener('click', () => {
            if (itemsContainer.children.length > 1) {
                row.remove();
                calculateTotals();
                updatePreview();
            } else {
                alert("En az bir satır olmalıdır.");
            }
        });

        itemsContainer.appendChild(row);
        updatePreview(); // Update preview when row added
    }

    function calculateTotals() {
        let subtotal = 0;
        let vatTotal = 0;

        const rows = document.querySelectorAll('.item-row');
        
        rows.forEach(row => {
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const vatRate = parseFloat(row.querySelector('.item-vat').value) || 0;

            const rowTotal = qty * price;
            const rowVat = rowTotal * (vatRate / 100);

            subtotal += rowTotal;
            vatTotal += rowVat;
        });

        const grandTotal = subtotal + vatTotal;

        // Update Display on Left Panel (if exists)
        const displaySubtotal = document.getElementById('displaySubtotal');
        const displayVatTotal = document.getElementById('displayVatTotal');
        const displayGrandTotal = document.getElementById('displayGrandTotal');
        
        if (displaySubtotal) displaySubtotal.textContent = formatCurrency(subtotal);
        if (displayVatTotal) displayVatTotal.textContent = formatCurrency(vatTotal);
        if (displayGrandTotal) displayGrandTotal.textContent = formatCurrency(grandTotal);
        
        return { subtotal, vatTotal, grandTotal };
    }

    function formatCurrency(amount) {
        return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    }
    
    // Maps form values to the preview pane
    function updatePreview() {
        // Invoice Info
        document.getElementById('pdfInvoiceNo').textContent = document.getElementById('invoiceNo').value || '-';
        const dateVal = document.getElementById('invoiceDate').value;
        document.getElementById('pdfInvoiceDate').textContent = dateVal ? new Date(dateVal).toLocaleDateString('tr-TR') : '-';
        
        // Sender Info
        document.getElementById('pdfSenderName').textContent = document.getElementById('senderName').value || 'ŞİRKET ADI';
        document.getElementById('pdfSenderAddress').textContent = document.getElementById('senderAddress').value || 'Adres Bilgisi';
        document.getElementById('pdfSenderPhone').textContent = document.getElementById('senderPhone').value;
        document.getElementById('pdfSenderTax').textContent = document.getElementById('senderTax').value;

        // Client Info
        document.getElementById('pdfClientName').textContent = document.getElementById('clientName').value || 'MÜŞTERİ ADI';
        document.getElementById('pdfClientAddress').textContent = document.getElementById('clientAddress').value;
        document.getElementById('pdfClientPhone').textContent = document.getElementById('clientPhone').value;
        document.getElementById('pdfClientTax').textContent = document.getElementById('clientTax').value;

        // Items Table
        const pdfItemsBody = document.getElementById('pdfItemsBody');
        pdfItemsBody.innerHTML = ''; 

        const rows = document.querySelectorAll('.item-row');
        let subtotal = 0;
        let vatTotal = 0;

        rows.forEach(row => {
            const desc = row.querySelector('.item-desc').value || '-';
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const vatRate = parseFloat(row.querySelector('.item-vat').value) || 0;

            const rowTotal = qty * price;
            const rowVat = rowTotal * (vatRate / 100);
            
            subtotal += rowTotal;
            vatTotal += rowVat;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${desc}</td>
                <td class="text-right">${formatCurrency(price)}</td>
                <td class="text-center">${qty}</td>
                <td class="text-center">%${vatRate}</td>
                <td class="text-right">${formatCurrency(rowTotal)}</td>
            `;
            pdfItemsBody.appendChild(tr);
        });

        // Totals in Preview
        document.getElementById('pdfSubtotal').textContent = formatCurrency(subtotal);
        document.getElementById('pdfVatTotal').textContent = formatCurrency(vatTotal);
        document.getElementById('pdfGrandTotal').textContent = formatCurrency(subtotal + vatTotal);
    }

    function generatePDF() {
        const element = document.getElementById('pdf-template');
        const invoiceNo = document.getElementById('invoiceNo').value || 'Taslak';

        const opt = {
            margin:       0, // No margin, we handle it in CSS padding
            filename:     `fatura_${invoiceNo}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Display loading state
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = 'İndiriliyor...';
        downloadBtn.disabled = true;

        html2pdf().set(opt).from(element).save().then(() => {
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }).catch(err => {
            console.error(err);
            alert('PDF Hatası: ' + err.message);
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        });
    }
});