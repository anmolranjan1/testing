
package com.compliance.main.service;

import com.compliance.main.dto.EmployeeTypeListResponseDTO;
import com.compliance.main.repository.PolicyRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.compliance.main.data.EmployeeType;
import com.compliance.main.dto.EmployeeTypeDTO;
import com.compliance.main.exception.BadRequestException;
import com.compliance.main.exception.ConflictException;
import com.compliance.main.exception.NotFoundException;
import com.compliance.main.repository.IEmployeeTypeRepository;
import com.compliance.main.repository.IUsersRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeTypeService {

    private final IEmployeeTypeRepository empTypeRepo;
    private final IUsersRepository usersRepo;
    private final PolicyRepository policyRepo;

    private static final Logger logger = LoggerFactory.getLogger(EmployeeTypeService.class);

    // Convert Entity -> DTO
    private EmployeeTypeDTO toDto(EmployeeType e) {
        if (e == null) return null;

        return EmployeeTypeDTO.builder()
                .empTypeId(e.getEmpTypeId())
                .empTypeName(e.getEmpTypeName())
                .build();
    }

    @Transactional
    public EmployeeTypeDTO create(String empTypeName) {
        logger.info("Creating EmployeeType: {}", empTypeName);
        if (empTypeName == null || empTypeName.trim().isEmpty()) {
            throw new BadRequestException("empTypeName is required");
        }
        String name = empTypeName.trim();

        // prevent duplicates (case-insensitive)
        if (empTypeRepo.existsByEmpTypeNameIgnoreCase(name)) {
            logger.warn("EmployeeType already exists: {}", name);
            throw new ConflictException("Employee type already exists");
        }

        EmployeeType saved = empTypeRepo.save(
            EmployeeType.builder()
                .empTypeName(name)
                .build());
        logger.info("EmployeeType created with id {}", saved.getEmpTypeId());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public EmployeeTypeDTO getById(Integer id) {
        logger.info("Fetching EmployeeType id={}", id);
        EmployeeType et = empTypeRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Employee type not found"));
        return toDto(et);
    }

    @Transactional
    public EmployeeTypeDTO update(EmployeeTypeDTO dto) {
        logger.info("Updating EmployeeType id={}", dto.getEmpTypeId());
        if (dto == null || dto.getEmpTypeId() == null) {
            throw new BadRequestException("empTypeId is required for update");
        }
        if (dto.getEmpTypeName() == null || dto.getEmpTypeName().trim().isEmpty()) {
            throw new BadRequestException("empTypeName is required");
        }

        EmployeeType existing = empTypeRepo.findById(dto.getEmpTypeId())
                .orElseThrow(() -> new NotFoundException("Employee type not found"));

        String newName = dto.getEmpTypeName().trim();

        // Only check duplicates if the name changes
        if (!existing.getEmpTypeName().equalsIgnoreCase(newName)
                && empTypeRepo.existsByEmpTypeNameIgnoreCase(newName)) {
            logger.warn("EmployeeType duplicate name on update: {}", newName);
            throw new ConflictException("Employee type already exists");
        }

        existing.setEmpTypeName(newName);
        EmployeeType saved = empTypeRepo.save(existing);
        logger.info("EmployeeType updated id={}", saved.getEmpTypeId());
        return toDto(saved);
    }

    @Transactional
    public void deleteById(Integer id) {
        logger.info("Deleting EmployeeType id={}", id);
        // Validate the employee type exists
        if (!empTypeRepo.existsById(id)) {
            throw new NotFoundException("Employee type not found");
        }

        // prevent delete if in use by any user
        if (usersRepo.existsByEmpType_EmpTypeId(id)) {
            logger.warn("Cannot delete EmployeeType id={} - in use by user", id);
            throw new ConflictException("Employee type in use");
        }

        // prevent delete if in use by a policy
        if(policyRepo.existsByEmployeeTypes_EmpTypeId(id)) {
            logger.warn("Cannot delete EmployeeType id={} - assigned to policy", id);
            throw new ConflictException("Employee Type is assigned to a policy");
        }

        empTypeRepo.deleteById(id);
        logger.info("Deleted EmployeeType id={}", id);
    }

    @Transactional(readOnly = true)
    public EmployeeTypeListResponseDTO list(Integer page, Integer size, String search) {
        logger.info("Listing EmployeeTypes page={} size={} search={}", page, size, search);
        int clientPage = (page == null || page < 1) ? 1 : page;
        int pageSize = (size == null || size <= 0) ? 20 : size;

        int page0 = clientPage - 1;

        Pageable pageable = PageRequest.of(page0, pageSize, Sort.by(Sort.Direction.ASC, "empTypeName"));

        String query = (search == null) ? null : search.trim();
        boolean hasQuery = (query != null && !query.isBlank());
        if (hasQuery && query.length() > 200) {
            query = query.substring(0, 200);
        }

        Page<EmployeeType> paged = hasQuery
                ? empTypeRepo.findByEmpTypeNameContainingIgnoreCase(query, pageable)
                : empTypeRepo.findAll(pageable);

        List<EmployeeTypeDTO> items = paged.getContent().stream()
                .map(this::toDto)
                .toList();

        return EmployeeTypeListResponseDTO.builder()
            .items(items)
            .page(clientPage)
            .size(pageSize)
            .total(paged.getTotalElements())
            .build();
    }
}