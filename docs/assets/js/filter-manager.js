class FilterManager {
  constructor() {
    this.activeFilters = {};
    this.config = {
      MAX_TERM_DISPLAY_LENGTH: 15,
      DEBOUNCE_DELAY: 300
    };
    this.debouncedApplyFilters = this.debounce(this.applyFilters.bind(this), this.config.DEBOUNCE_DELAY);
  }

  init() {
    this.initializeDropdowns();
    this.initializeDatePicker();
    this.initializeClearButtons();
    this.initializeClickOutside();
  }

  initializeDropdowns() {
    document.querySelectorAll('.filter-trigger').forEach(trigger => {
      trigger.addEventListener('click', this.handleDropdownClick.bind(this));
    });

    document.querySelectorAll('.apply-filter-btn').forEach(btn => {
      btn.addEventListener('click', this.handleApplyFilter.bind(this));
    });

    document.querySelectorAll('.clear-individual-btn').forEach(btn => {
      btn.addEventListener('click', this.handleClearIndividual.bind(this));
    });
  }

  handleDropdownClick(e) {
    e.stopPropagation();
    const dropdown = e.target.closest('.filter-dropdown');
    const content = dropdown.querySelector('.filter-content');
    const isOpen = content.classList.contains('show');

    this.closeAllDropdowns();

    if (!isOpen) {
      content.classList.add('show');
      e.target.classList.add('active');
    }
  }

  handleApplyFilter(e) {
    e.preventDefault();
    const dropdown = e.target.closest('.filter-dropdown');
    const filterType = dropdown.querySelector('.filter-trigger').dataset.filter;

    this.processFilterValues(dropdown, filterType);
    this.updateFilterDisplay(dropdown, filterType);
    this.closeDropdown(dropdown);
    this.updateMobileSummary();
    this.syncWithMainForm();
    this.debouncedApplyFilters();
  }

  processFilterValues(dropdown, filterType) {
    const inputs = dropdown.querySelectorAll('input');

    switch (filterType) {
      case 'sales-date':
        this.processSalesDateFilter(inputs[0]);
        break;
      case 'writ-amount':
        this.processAmountFilter(inputs[0], inputs[1]);
        break;
      case 'terms':
        this.processTermsFilter(inputs[0]);
        break;
      case 'zip':
        this.processZipFilter(inputs[0]);
        break;
    }
  }

  processSalesDateFilter(dateInput) {
    if (dateInput.value.trim()) {
      this.activeFilters.salesDate = dateInput.value;
    } else {
      delete this.activeFilters.salesDate;
    }
  }

  processAmountFilter(minInput, maxInput) {
    const minValue = minInput.value.trim();
    const maxValue = maxInput.value.trim();

    if (minValue || maxValue) {
      if (minValue) this.activeFilters.minAmount = minValue;
      if (maxValue) this.activeFilters.maxAmount = maxValue;
    } else {
      delete this.activeFilters.minAmount;
      delete this.activeFilters.maxAmount;
    }
  }

  processTermsFilter(termsInput) {
    if (termsInput.value.trim()) {
      this.activeFilters.terms = termsInput.value;
    } else {
      delete this.activeFilters.terms;
    }
  }

  processZipFilter(zipInput) {
    if (zipInput.value.trim()) {
      this.activeFilters.zip = zipInput.value;
    } else {
      delete this.activeFilters.zip;
    }
  }

  updateFilterDisplay(dropdown, filterType) {
    const trigger = dropdown.querySelector('.filter-trigger');
    const valueSpan = trigger.querySelector('.filter-value');
    const displayValue = this.getDisplayValue(filterType);

    valueSpan.textContent = displayValue;

    if (this.hasActiveFilter(filterType)) {
      trigger.classList.add('active');
    } else {
      trigger.classList.remove('active');
    }
  }

  getDisplayValue(filterType) {
    switch (filterType) {
      case 'sales-date':
        return this.activeFilters.salesDate || 'All';
      case 'writ-amount':
        return this.getAmountDisplayValue();
      case 'terms':
        return this.getTermsDisplayValue();
      case 'zip':
        return this.activeFilters.zip || 'All';
      default:
        return 'All';
    }
  }

  getAmountDisplayValue() {
    const { minAmount, maxAmount } = this.activeFilters;

    if (minAmount && maxAmount) {
      return `$${minAmount} - $${maxAmount}`;
    } else if (minAmount) {
      return `> $${minAmount}`;
    } else if (maxAmount) {
      return `< $${maxAmount}`;
    }
    return 'All';
  }

  getTermsDisplayValue() {
    if (!this.activeFilters.terms) return 'All';

    const terms = this.activeFilters.terms;
    return terms.length > this.config.MAX_TERM_DISPLAY_LENGTH
      ? terms.substring(0, this.config.MAX_TERM_DISPLAY_LENGTH) + '...'
      : terms;
  }

  hasActiveFilter(filterType) {
    switch (filterType) {
      case 'sales-date':
        return !!this.activeFilters.salesDate;
      case 'writ-amount':
        return !!(this.activeFilters.minAmount || this.activeFilters.maxAmount);
      case 'terms':
        return !!this.activeFilters.terms;
      case 'zip':
        return !!this.activeFilters.zip;
      default:
        return false;
    }
  }

  handleClearIndividual(e) {
    e.preventDefault();
    const filterType = e.target.dataset.filter;
    const dropdown = e.target.closest('.filter-dropdown');

    this.clearFilter(filterType, dropdown);
    this.updateFilterDisplay(dropdown, filterType);
    this.closeDropdown(dropdown);
    this.updateMobileSummary();
    this.syncWithMainForm();
    this.debouncedApplyFilters();
  }

  clearFilter(filterType, dropdown) {
    switch (filterType) {
      case 'sales-date':
        delete this.activeFilters.salesDate;
        this.clearSalesDateInput(dropdown);
        break;
      case 'writ-amount':
        delete this.activeFilters.minAmount;
        delete this.activeFilters.maxAmount;
        dropdown.querySelector('input[name="minAmount"]').value = '';
        dropdown.querySelector('input[name="maxAmount"]').value = '';
        break;
      case 'terms':
        delete this.activeFilters.terms;
        dropdown.querySelector('input[name="terms"]').value = '';
        break;
      case 'zip':
        delete this.activeFilters.zip;
        dropdown.querySelector('input[name="zip"]').value = '';
        break;
    }
  }

  clearSalesDateInput(dropdown) {
    const input = dropdown.querySelector('input[name="salesDate"]');
    input.value = '';

    if ($(input).data('daterangepicker')) {
      $(input).data('daterangepicker').setStartDate(moment());
      $(input).data('daterangepicker').setEndDate(moment());
    }
  }

  initializeDatePicker() {
    const salesDateInput = document.querySelector('#sales-date-dropdown input[name="salesDate"]');
    if (!salesDateInput) return;

    $(salesDateInput).daterangepicker({
      autoUpdateInput: false,
      locale: { cancelLabel: 'Clear' }
    });

    $(salesDateInput).on('apply.daterangepicker', (ev, picker) => {
      const dateRange = `${picker.startDate.format('MM/DD/YYYY')} - ${picker.endDate.format('MM/DD/YYYY')}`;
      $(salesDateInput).val(dateRange);

      this.activeFilters.salesDate = dateRange;
      this.updateSalesDateDisplay(dateRange);
      this.updateMobileSummary();
      this.syncWithMainForm();
      this.debouncedApplyFilters();
    });

    $(salesDateInput).on('cancel.daterangepicker', () => {
      $(salesDateInput).val('');
      delete this.activeFilters.salesDate;

      this.updateSalesDateDisplay('All');
      this.updateMobileSummary();
      this.syncWithMainForm();
      this.debouncedApplyFilters();
    });
  }

  updateSalesDateDisplay(value) {
    const trigger = document.querySelector('#sales-date-dropdown .filter-trigger');
    const valueSpan = trigger.querySelector('.filter-value');
    valueSpan.textContent = value;

    if (value === 'All') {
      trigger.classList.remove('active');
    } else {
      trigger.classList.add('active');
    }
  }

  initializeClearButtons() {
    const clearBtn = document.getElementById('clear-filters-btn');
    const clearMobileBtn = document.getElementById('clear-filters-mobile-btn');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllFilters());
    }

    if (clearMobileBtn) {
      clearMobileBtn.addEventListener('click', () => this.clearAllFilters());
    }
  }

  initializeClickOutside() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-dropdown')) {
        this.closeAllDropdowns();
      }
    });
  }

  closeAllDropdowns() {
    document.querySelectorAll('.filter-content').forEach(c => c.classList.remove('show'));
    document.querySelectorAll('.filter-trigger').forEach(t => t.classList.remove('active'));
  }

  closeDropdown(dropdown) {
    dropdown.querySelector('.filter-content').classList.remove('show');
    dropdown.querySelector('.filter-trigger').classList.remove('active');
  }

  clearAllFilters() {
    this.activeFilters = {};
    this.resetAllDisplays();
    this.resetAllInputs();
    this.updateMobileSummary();
    this.syncWithMainForm();
    this.debouncedApplyFilters();
  }

  resetAllDisplays() {
    document.querySelectorAll('.filter-trigger').forEach(trigger => {
      const valueSpan = trigger.querySelector('.filter-value');
      valueSpan.textContent = 'All';
      trigger.classList.remove('active');
    });
  }

  resetAllInputs() {
    document.querySelectorAll('.filter-panel input').forEach(input => {
      input.value = '';
    });

    const salesDateInput = document.querySelector('#sales-date-dropdown input[name="salesDate"]');
    if (salesDateInput && $(salesDateInput).data('daterangepicker')) {
      $(salesDateInput).data('daterangepicker').setStartDate(moment());
      $(salesDateInput).data('daterangepicker').setEndDate(moment());
      $(salesDateInput).val('');
    }
  }

  updateMobileSummary() {
    const activeCount = Object.keys(this.activeFilters).length;
    const summaryText = document.querySelector('.filter-summary-text');

    if (summaryText) {
      summaryText.textContent = `Filters: ${activeCount} applied`;
    }

    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', activeCount === 0);
    }
  }

  syncWithMainForm() {
    const form = document.getElementById('filters-form');
    if (!form) return;

    form.reset();

    Object.keys(this.activeFilters).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = this.activeFilters[key];
      }
    });
  }

  updateDesktopFilterDisplays() {
    const filterTypes = ['sales-date', 'writ-amount', 'terms', 'zip'];

    filterTypes.forEach(filterType => {
      const dropdown = document.querySelector(`#${filterType.replace('-', '-')}-dropdown`);
      if (dropdown) {
        this.updateFilterDisplay(dropdown, filterType);
      }
    });

    this.updateMobileSummary();
  }

  applyFilters() {
    const filterParams = this.getFilterParams();

    if (window.App && App.searchData) {
      const result = App.searchData(filterParams);
      document.getElementById('property-count-tag').textContent = result + ' Properties';
    }
  }

  getFilterParams() {
    return {
      salesDate: this.activeFilters.salesDate || '',
      maxAmount: this.activeFilters.maxAmount || '',
      minAmount: this.activeFilters.minAmount || '',
      terms: this.activeFilters.terms || '',
      zip: this.activeFilters.zip || ''
    };
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public method to sync mobile modal changes
  syncFromMobileModal() {
    const form = document.getElementById('filters-form');
    if (!form) return;

    const formData = new FormData(form);
    this.activeFilters = {};

    if (formData.get('salesDate')) this.activeFilters.salesDate = formData.get('salesDate');
    if (formData.get('minAmount')) this.activeFilters.minAmount = formData.get('minAmount');
    if (formData.get('maxAmount')) this.activeFilters.maxAmount = formData.get('maxAmount');
    if (formData.get('terms')) this.activeFilters.terms = formData.get('terms');
    if (formData.get('zip')) this.activeFilters.zip = formData.get('zip');

    this.updateDesktopFilterDisplays();
  }
}

// Export for use in main script
window.FilterManager = FilterManager;