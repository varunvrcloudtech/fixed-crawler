import { supabase, auth } from './supabaseClient.js';

// Configuration - Edge Function URL
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-website`;

// State
let currentUser = null;
let currentScrapeData = null;

// Initialize - check authentication
async function init() {
    const { session, error } = await auth.getSession();

    if (!session) {
        // Not logged in, redirect to login
        window.location.href = '/';
        return;
    }

    currentUser = session.user;
    updateUserDisplay();
    
    // Listen for auth changes
    auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = '/';
        } else if (session) {
            currentUser = session.user;
            updateUserDisplay();
        }
    });
}

function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    const userAvatar = document.getElementById('userAvatar');
    
    if (currentUser) {
        // Try to get display name from user metadata
        const displayName = currentUser.user_metadata?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0] || 
                           'User';
        
        userDisplay.textContent = `Welcome, ${displayName}`;
        
        // Show avatar if available (from Google OAuth)
        const avatarUrl = currentUser.user_metadata?.avatar_url || 
                         currentUser.user_metadata?.picture;
        
        if (avatarUrl) {
            userAvatar.src = avatarUrl;
            userAvatar.style.display = 'block';
        }
    }
}

// Tab switching
window.switchTab = function(tabName) {
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    if (tabName === 'realEstate') {
        document.querySelector('.tab-button:nth-child(1)').classList.add('active');
        document.getElementById('realEstateTab').classList.add('active');
    } else if (tabName === 'general') {
        document.querySelector('.tab-button:nth-child(2)').classList.add('active');
        document.getElementById('generalTab').classList.add('active');
    } else if (tabName === 'history') {
        document.querySelector('.tab-button:nth-child(3)').classList.add('active');
        document.getElementById('historyTab').classList.add('active');
        loadHistory();
    }
};

// Real Estate Sub-tab switching
window.switchRealEstateSubTab = function(subTabName) {
    const subTabs = document.querySelectorAll('.sub-tab-button');
    const subContents = document.querySelectorAll('.sub-tab-content');

    subTabs.forEach(tab => tab.classList.remove('active'));
    subContents.forEach(content => content.classList.remove('active'));

    if (subTabName === 'scrape') {
        document.querySelector('.sub-tab-button:nth-child(1)').classList.add('active');
        document.getElementById('realEstateScrapeTab').classList.add('active');
    } else if (subTabName === 'choices') {
        document.querySelector('.sub-tab-button:nth-child(2)').classList.add('active');
        document.getElementById('realEstateChoicesTab').classList.add('active');
        loadChoices();
    }
};

// URL helpers
window.setUrl = function(url) {
    document.getElementById('scrapeUrl').value = url;
};

window.setGeneralUrl = function(url) {
    document.getElementById('generalScrapeUrl').value = url;
};

// Logout
window.logout = async function() {
    const { error } = await auth.signOut();
    if (!error) {
        window.location.href = '/';
    } else {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
    }
};

// Real Estate Scraping
window.startScraping = async function() {
    const url = document.getElementById('scrapeUrl').value;
    const location = document.getElementById('location').value;
    const propertyType = document.getElementById('propertyType').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const distanceFrom = document.getElementById('distanceFrom').value;
    const maxDistance = document.getElementById('maxDistance').value;

    if (!url) {
        alert('Please enter a URL to scrape');
        return;
    }

    document.getElementById('loading').classList.add('active');
    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('scrapeBtn').disabled = true;
    document.getElementById('scrapeBtn').textContent = '⏳ Scraping...';

    try {
        const { session } = await auth.getSession();

        console.log('Making request to:', EDGE_FUNCTION_URL);
        console.log('Session:', session);

        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                url: url,
                formats: ['markdown', 'html'],
                onlyMainContent: true
            })
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Result:', result);

        document.getElementById('loading').classList.remove('active');
        document.getElementById('scrapeBtn').disabled = false;
        document.getElementById('scrapeBtn').textContent = '🚀 Scrape';

        if (response.ok) {
            const params = {
                location,
                property_type: propertyType,
                min_price: minPrice,
                max_price: maxPrice,
                distance_from: distanceFrom,
                max_distance: maxDistance
            };

            const scraped_content = result.data || {};
            const listings = parseRealEstateData(scraped_content, params);

            currentScrapeData = {
                scrape_type: 'real_estate',
                url: url,
                title: `Real Estate - ${params.location || 'Unknown Location'}`,
                content: {
                    params,
                    scraped_content,
                    listings
                }
            };

            displayResults({
                success: true,
                data: listings,
                raw_content: scraped_content.markdown ? scraped_content.markdown.substring(0, 2000) : '',
                source_url: url
            });
        } else {
            console.error('API Error:', result);
            displayError(`Firecrawl API error: ${response.status}`, JSON.stringify(result.error || result));
        }
    } catch (error) {
        console.error('Scraping error:', error);
        document.getElementById('loading').classList.remove('active');
        document.getElementById('scrapeBtn').disabled = false;
        document.getElementById('scrapeBtn').textContent = '🚀 Scrape';
        displayError('Network error: ' + error.message);
    }
};

function parseRealEstateData(content, params) {
    const listings = [];
    const markdown = content.markdown || '';
    const html = content.html || '';

    const priceRegex = /\$\s*[\d,]+(?:\.\d{2})?/g;
    const prices = markdown.match(priceRegex) || [];

    const addressRegex = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir)[,\s]+[A-Za-z\s]+/gi;
    const addresses = markdown.match(addressRegex) || [];

    const bedsRegex = /(\d+)\s*(?:bed|bd|bedroom)s?/gi;
    const bathsRegex = /(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)s?/gi;
    const sqftRegex = /(\d{1,3}(?:,\d{3})*)\s*(?:sq\s*ft|sqft|square\s*feet)/gi;

    const beds = [...markdown.matchAll(bedsRegex)];
    const baths = [...markdown.matchAll(bathsRegex)];
    const sqfts = [...markdown.matchAll(sqftRegex)];

    if (prices.length > 0 && (addresses.length > 0 || beds.length > 0)) {
        const maxListings = Math.min(10, Math.max(prices.length, addresses.length, beds.length));

        for (let i = 0; i < maxListings; i++) {
            const price = prices[i] || 'Price not found';
            const address = addresses[i] || params.location || 'Address not specified';
            const bedCount = beds[i] ? beds[i][1] : 'N/A';
            const bathCount = baths[i] ? baths[i][1] : 'N/A';
            const sqft = sqfts[i] ? sqfts[i][1] : 'N/A';

            if (shouldIncludeListing(price, params)) {
                listings.push({
                    source: 'Scraped Listing',
                    location: address,
                    property_type: params.property_type || 'Property',
                    price_range: price,
                    distance_from: params.distance_from || 'N/A',
                    max_distance: params.max_distance ? `${params.max_distance} miles` : 'N/A',
                    beds: bedCount,
                    baths: bathCount,
                    sqft: sqft,
                    content_preview: `${bedCount} bed, ${bathCount} bath, ${sqft} sqft`,
                    status: 'Extracted'
                });
            }
        }
    }

    if (listings.length === 0) {
        listings.push({
            source: 'Scraped Data',
            location: params.location || 'N/A',
            property_type: params.property_type || 'N/A',
            price_range: prices[0] || `$${params.min_price || '0'} - $${params.max_price || 'No limit'}`,
            distance_from: params.distance_from || 'N/A',
            max_distance: params.max_distance ? `${params.max_distance} miles` : 'N/A',
            beds: 'N/A',
            baths: 'N/A',
            sqft: 'N/A',
            content_preview: markdown.substring(0, 300) || 'No detailed content extracted',
            status: 'Basic Extraction'
        });
    }

    return listings;
}

function shouldIncludeListing(priceStr, params) {
    if (!params.min_price && !params.max_price) {
        return true;
    }

    const priceMatch = priceStr.match(/[\d,]+/);
    if (!priceMatch) {
        return true;
    }

    const price = parseInt(priceMatch[0].replace(/,/g, ''));

    if (params.min_price && price < parseInt(params.min_price)) {
        return false;
    }

    if (params.max_price && price > parseInt(params.max_price)) {
        return false;
    }

    return true;
}

function displayResults(result) {
    const container = document.getElementById('resultsContainer');

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
            <p style="color: #666; margin: 0;">
                <strong>Source:</strong> ${escapeHtml(result.source_url)}
            </p>
            <div style="display: flex; gap: 10px;">
                <button class="btn-add-choice" onclick="addCurrentToChoices()">⭐ Add to My Choices</button>
                <button class="btn-save" onclick="saveToDatabase()">💾 Save to Database</button>
            </div>
        </div>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Location</th>
                    <th>Price</th>
                    <th>Beds</th>
                    <th>Baths</th>
                    <th>Sqft</th>
                    <th>Type</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    result.data.forEach(item => {
        html += `
            <tr>
                <td>${escapeHtml(item.location)}</td>
                <td style="font-weight: 600; color: #2e7d32;">${escapeHtml(item.price_range)}</td>
                <td>${escapeHtml(item.beds || 'N/A')}</td>
                <td>${escapeHtml(item.baths || 'N/A')}</td>
                <td>${escapeHtml(item.sqft || 'N/A')}</td>
                <td>${escapeHtml(item.property_type)}</td>
                <td><span class="status-success">${escapeHtml(item.status)}</span></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    if (result.raw_content) {
        html += `
            <h3 style="margin-top: 30px; color: #333;">Raw Scraped Content (Preview)</h3>
            <div class="raw-content">${escapeHtml(result.raw_content)}</div>
        `;
    }

    container.innerHTML = html;
}

function displayError(error, details) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="error-box">
            <strong>Error:</strong> ${escapeHtml(error)}
            ${details ? '<br><br><strong>Details:</strong> ' + escapeHtml(details) : ''}
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// General Website Scraping
window.startGeneralScraping = async function() {
    const url = document.getElementById('generalScrapeUrl').value;
    const format = document.getElementById('scrapeFormat').value;
    const mainContentOnly = document.getElementById('mainContentOnly').value === 'true';

    if (!url) {
        alert('Please enter a URL to scrape');
        return;
    }

    document.getElementById('loading').classList.add('active');
    document.getElementById('resultsContainer').innerHTML = '';
    document.getElementById('generalScrapeBtn').disabled = true;
    document.getElementById('generalScrapeBtn').textContent = '⏳ Scraping...';

    let formats = [];
    if (format === 'both') {
        formats = ['markdown', 'html'];
    } else {
        formats = [format];
    }

    try {
        const { session } = await auth.getSession();

        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                url: url,
                formats: formats,
                onlyMainContent: mainContentOnly
            })
        });

        const result = await response.json();

        document.getElementById('loading').classList.remove('active');
        document.getElementById('generalScrapeBtn').disabled = false;
        document.getElementById('generalScrapeBtn').textContent = '🚀 Scrape';

        if (response.ok) {
            currentScrapeData = {
                scrape_type: 'general',
                url: url,
                title: `General Scrape - ${new URL(url).hostname}`,
                content: {
                    format,
                    mainContentOnly,
                    data: result.data
                }
            };
            displayGeneralResults(result, url, format);
        } else {
            displayError(`Firecrawl API error: ${response.status}`, result.error || response.statusText);
        }
    } catch (error) {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('generalScrapeBtn').disabled = false;
        document.getElementById('generalScrapeBtn').textContent = '🚀 Scrape';
        displayError('Network error: ' + error.message);
    }
};

function displayGeneralResults(result, url, format) {
    const container = document.getElementById('resultsContainer');
    const data = result.data || {};

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div>
                <p style="color: #666; margin-bottom: 10px;">
                    <strong>Source URL:</strong> <a href="${escapeHtml(url)}" target="_blank" style="color: #0f3460;">${escapeHtml(url)}</a>
                </p>
                <p style="color: #666; margin-bottom: 10px;">
                    <strong>Format:</strong> ${format === 'both' ? 'Markdown & HTML' : format.toUpperCase()}
                </p>
                <p style="color: #666;">
                    <strong>Status:</strong> <span class="status-success">Successfully Scraped</span>
                </p>
            </div>
            <button class="btn-save" onclick="saveToDatabase()">💾 Save to Database</button>
        </div>
    `;

    if (data.markdown) {
        html += `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #333; margin-bottom: 15px;">📝 Markdown Content</h3>
                <div class="raw-content" style="max-height: 500px;">${escapeHtml(data.markdown)}</div>
            </div>
        `;
    }

    if (data.html && format !== 'markdown') {
        html += `
            <div style="margin-bottom: 30px;">
                <h3 style="color: #333; margin-bottom: 15px;">🔖 HTML Content</h3>
                <div class="raw-content" style="max-height: 500px;">${escapeHtml(data.html.substring(0, 5000))}</div>
            </div>
        `;
    }

    if (data.metadata) {
        html += `
            <div>
                <h3 style="color: #333; margin-bottom: 15px;">📊 Metadata</h3>
                <div class="raw-content" style="max-height: 300px;">${escapeHtml(JSON.stringify(data.metadata, null, 2))}</div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Save to Database
window.saveToDatabase = async function() {
    if (!currentScrapeData || !currentUser) {
        alert('No data to save or not logged in');
        return;
    }

    try {
        // Get fresh session to ensure we have the correct user_id
        const { session } = await auth.getSession();

        if (!session || !session.user) {
            alert('Session expired. Please log in again.');
            window.location.href = '/';
            return;
        }

        console.log('Saving with user_id:', session.user.id);
        console.log('Scrape data:', currentScrapeData);

        const { data, error } = await supabase
            .from('scraped_data')
            .insert([{
                user_id: session.user.id,
                scrape_type: currentScrapeData.scrape_type,
                url: currentScrapeData.url,
                title: currentScrapeData.title,
                content: currentScrapeData.content
            }])
            .select();

        if (error) {
            console.error('Error saving to database:', error);
            alert('Failed to save to database: ' + error.message);
        } else {
            alert('Successfully saved to database!');
            currentScrapeData = null;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to save to database');
    }
};

// Load History
async function loadHistory() {
    if (!currentUser) {
        document.getElementById('historyContainer').innerHTML = '<p style="color: #666;">Please wait, loading user data...</p>';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('scraped_data')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading history:', error);
            document.getElementById('historyContainer').innerHTML = '<p style="color: #f44336;">Failed to load history</p>';
            return;
        }

        if (!data || data.length === 0) {
            document.getElementById('historyContainer').innerHTML = '<div class="no-results"><p>No saved scrapes yet. Scrape some websites and save them to see them here!</p></div>';
            return;
        }

        displayHistory(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('historyContainer').innerHTML = '<p style="color: #f44336;">Failed to load history</p>';
    }
}

function displayHistory(items) {
    const container = document.getElementById('historyContainer');

    let html = '<div class="history-grid">';

    items.forEach(item => {
        const date = new Date(item.created_at).toLocaleString();
        const typeLabel = item.scrape_type === 'real_estate' ? 'Real Estate' : 'General Web';
        const typeBadge = item.scrape_type === 'real_estate' ? 'badge-real-estate' : 'badge-general';

        html += `
            <div class="history-card">
                <div class="history-header">
                    <h3>${escapeHtml(item.title)}</h3>
                    <span class="history-badge ${typeBadge}">${typeLabel}</span>
                </div>
                <p class="history-url">
                    <strong>URL:</strong> <a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url)}</a>
                </p>
                <p class="history-date">
                    <strong>Date:</strong> ${date}
                </p>
                <div class="history-actions">
                    <button class="btn-view" onclick="viewScrapeDetails('${item.id}')">View Details</button>
                    <button class="btn-delete" onclick="deleteScrape('${item.id}')">Delete</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

window.viewScrapeDetails = async function(id) {
    try {
        const { data, error } = await supabase
            .from('scraped_data')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !data) {
            alert('Failed to load scrape details');
            return;
        }

        const content = JSON.stringify(data.content, null, 2);
        const detailsHtml = `
            <div class="details-modal">
                <div class="details-modal-content">
                    <div class="details-modal-header">
                        <h2>${escapeHtml(data.title)}</h2>
                        <button onclick="closeDetails()" class="btn-close">×</button>
                    </div>
                    <div class="details-modal-body">
                        <p><strong>URL:</strong> <a href="${escapeHtml(data.url)}" target="_blank">${escapeHtml(data.url)}</a></p>
                        <p><strong>Type:</strong> ${data.scrape_type === 'real_estate' ? 'Real Estate' : 'General Web'}</p>
                        <p><strong>Date:</strong> ${new Date(data.created_at).toLocaleString()}</p>
                        <h3>Content:</h3>
                        <div class="raw-content" style="max-height: 400px;">${escapeHtml(content)}</div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', detailsHtml);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load details');
    }
};

window.closeDetails = function() {
    const modal = document.querySelector('.details-modal');
    if (modal) {
        modal.remove();
    }
};

window.deleteScrape = async function(id) {
    if (!confirm('Are you sure you want to delete this scrape?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('scraped_data')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Failed to delete scrape: ' + error.message);
            return;
        }

        alert('Scrape deleted successfully');
        loadHistory();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete scrape');
    }
};

// Real Estate Choices Management
window.addCurrentToChoices = async function() {
    if (!currentScrapeData || currentScrapeData.scrape_type !== 'real_estate') {
        alert('No real estate data to add to choices');
        return;
    }

    if (!currentUser) {
        alert('Please log in to add choices');
        return;
    }

    try {
        const { session } = await auth.getSession();
        if (!session || !session.user) {
            alert('Session expired. Please log in again.');
            window.location.href = '/';
            return;
        }

        const params = currentScrapeData.content.params;
        const listings = currentScrapeData.content.listings;

        if (!listings || listings.length === 0) {
            alert('No listings found in current scrape data');
            return;
        }

        const listing = listings[0];

        const contentPreview = listing.beds && listing.baths && listing.sqft
            ? `${listing.beds} bed, ${listing.baths} bath, ${listing.sqft} sqft`
            : listing.content_preview || 'No details available';

        const { data, error } = await supabase
            .from('real_estate_choices')
            .insert([{
                user_id: session.user.id,
                location: listing.location || params.location || 'N/A',
                property_type: listing.property_type || params.property_type || 'N/A',
                price_range: listing.price_range || `$${params.min_price || '0'} - $${params.max_price || 'No limit'}`,
                distance_from: listing.distance_from || params.distance_from || null,
                max_distance: listing.max_distance || params.max_distance || null,
                content_preview: contentPreview,
                source_url: currentScrapeData.url
            }])
            .select();

        if (error) {
            console.error('Error adding to choices:', error);
            alert('Failed to add to choices: ' + error.message);
        } else {
            alert('Successfully added to My Choices!');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add to choices');
    }
};

async function loadChoices() {
    if (!currentUser) {
        document.getElementById('choicesContainer').innerHTML = '<p style="color: #666;">Please wait, loading user data...</p>';
        return;
    }

    try {
        const { data, error } = await supabase
            .from('real_estate_choices')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading choices:', error);
            document.getElementById('choicesContainer').innerHTML = '<p style="color: #f44336;">Failed to load choices</p>';
            return;
        }

        if (!data || data.length === 0) {
            document.getElementById('choicesContainer').innerHTML = '<div class="no-results"><p>No choices saved yet. Scrape real estate data and add properties to your choices!</p></div>';
            return;
        }

        displayChoices(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('choicesContainer').innerHTML = '<p style="color: #f44336;">Failed to load choices</p>';
    }
}

function displayChoices(items) {
    const container = document.getElementById('choicesContainer');

    let html = `
        <div class="choices-table-container">
            <table class="choices-table">
                <thead>
                    <tr>
                        <th>Location</th>
                        <th>Property Type</th>
                        <th>Price Range</th>
                        <th>Details</th>
                        <th>Distance From</th>
                        <th>Added</th>
                        <th>Notes</th>
                        <th>Source</th>
                        <th>Like</th>
                    </tr>
                </thead>
                <tbody>
    `;

    items.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString();
        const liked = item.liked || false;
        const likeIcon = liked ? '❤️' : '🤍';

        html += `
            <tr>
                <td><strong>${escapeHtml(item.location)}</strong></td>
                <td>${escapeHtml(item.property_type)}</td>
                <td style="font-weight: 600; color: #2e7d32;">${escapeHtml(item.price_range)}</td>
                <td>${item.content_preview ? escapeHtml(item.content_preview) : '-'}</td>
                <td>${item.distance_from ? escapeHtml(item.distance_from) + (item.max_distance ? ` (${item.max_distance} mi)` : '') : '-'}</td>
                <td>${date}</td>
                <td>
                    ${item.notes ? `<span title="${escapeHtml(item.notes)}">${escapeHtml(item.notes.substring(0, 30))}${item.notes.length > 30 ? '...' : ''}</span>` : '-'}
                    <button class="btn-edit-notes" onclick="editChoiceNotes('${item.id}', '${escapeHtml(item.notes || '')}')">✏️</button>
                </td>
                <td>
                    ${item.source_url ? `<a href="${escapeHtml(item.source_url)}" target="_blank" class="source-link">🔗 View</a>` : '-'}
                </td>
                <td>
                    <button class="btn-like ${liked ? 'liked' : ''}" onclick="toggleLike('${item.id}', ${liked})" title="${liked ? 'Unlike' : 'Like'}">
                        ${likeIcon}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

window.toggleLike = async function(choiceId, currentLiked) {
    try {
        const { error } = await supabase
            .from('real_estate_choices')
            .update({ liked: !currentLiked })
            .eq('id', choiceId);

        if (error) {
            console.error('Error toggling like:', error);
            alert('Failed to update like status');
            return;
        }

        await loadMyChoices();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update like status');
    }
};

window.editChoiceNotes = async function(id, currentNotes) {
    const notes = prompt('Add or edit notes for this property:', currentNotes);

    if (notes === null) {
        return;
    }

    try {
        const { error } = await supabase
            .from('real_estate_choices')
            .update({ notes: notes })
            .eq('id', id);

        if (error) {
            alert('Failed to update notes: ' + error.message);
            return;
        }

        loadChoices();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update notes');
    }
};

window.deleteChoice = async function(id) {
    if (!confirm('Are you sure you want to remove this from your choices?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('real_estate_choices')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Failed to delete choice: ' + error.message);
            return;
        }

        alert('Choice removed successfully');
        loadChoices();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete choice');
    }
};

// Initialize on load
init();
