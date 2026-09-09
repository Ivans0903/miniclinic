const validateSoapPayload = (body) => {
    const errors = {};

    if (!body.registration_id) {
        errors.registration_id = "ID Registrasi wajib diisi";
    }
    
    if (!body.subjective || body.subjective.trim() === '') {
        errors.subjective = "Keluhan subjektif wajib diisi";
    }
    
    if (!body.tekanan_darah || body.tekanan_darah.trim() === '') {
        errors.tekanan_darah = "Tekanan darah wajib diisi";
    }
    
    if (body.suhu_tubuh === undefined || body.suhu_tubuh === null || parseFloat(body.suhu_tubuh) <= 0) {
        errors.suhu_tubuh = "Suhu tubuh tidak valid";
    }
    
    if (body.berat_badan === undefined || body.berat_badan === null || parseFloat(body.berat_badan) <= 0) {
        errors.berat_badan = "Berat badan tidak valid";
    }
    
    if (body.tinggi_badan === undefined || body.tinggi_badan === null || parseFloat(body.tinggi_badan) <= 0) {
        errors.tinggi_badan = "Tinggi badan tidak valid";
    }
    
    if (!body.assessment || body.assessment.trim() === '') {
        errors.assessment = "Diagnosa (assessment) wajib diisi";
    }
    
    if (!body.plan || body.plan.trim() === '') {
        errors.plan = "Rencana terapi (plan) wajib diisi";
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors: errors };
    }

    return { isValid: true, errors: {} };
};

module.exports = {
    validateSoapPayload
};
